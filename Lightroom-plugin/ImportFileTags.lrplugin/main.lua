--[[ Debug ]]
local Require = require 'Require'.path ("../debugscript.lrdevplugin")
local Debug = require 'Debug'.init ()
require 'strict'

local json = require("json")
local FileUtil = import("LrFileUtils") --for readFile
local Dialogs = import("LrDialogs") --for runOpenPanel to select tags file
local Application = import("LrApplication") --for activeCatalog
local Tasks = import("LrTasks")
local FunctionContext = import("LrFunctionContext")
local Catalog = Application.activeCatalog()

local category = {
	getName = function(str)
		return str:match("(.+):")
	end,
	getValue = function(str)
		return str:match("^.+: ([%w%(%) ]+)>?")
	end,
	getSubValue = function(str)
		return str:match("> (.+)$")
	end,
}

function writeTagsToCatalog(data)
	FunctionContext.callWithContext("function", function(context)
		local progress = Dialogs.showModalProgressDialog({
			title = "Tag Importer",
			caption = "Starting...",
			cannotCancel = true,
			functionContext = context
		})
		local photos = Catalog:getMultipleSelectedOrAllPhotos()
		local nPhotos = #photos
		local importKeyword = nil --A container for our imported keywords so as not to make mess.
		local categories = {}
		local photoMatches = {} --array - {LrPhoto, {LrKeywords}}

		Catalog:withWriteAccessDo("createImport", function()
			importKeyword = Catalog:createKeyword("Imported", {}, true, nil, true)
		end)
		--the unavailablity of keywords within the same write access gate messed up my code a bit. may restructure in future.
		Catalog:withWriteAccessDo("createCategories", function()
			categories.medium = Catalog:createKeyword("Medium", {}, true, importKeyword, true)
			categories.type = Catalog:createKeyword("Type", {}, true, importKeyword, true)
			categories.gender = Catalog:createKeyword("Gender", {}, true, importKeyword, true)
			categories.rating = Catalog:createKeyword("Rating", {}, true, importKeyword, true)
			categories.species = Catalog:createKeyword("Species", {}, true, importKeyword, true)
		end)
		progress:setCaption("Creating keywords")
		for i, photo in pairs(photos) do
			Catalog:withWriteAccessDo("createKeywords", function()
				progress:setPortionComplete(i, nPhotos)
				local name = photo:getFormattedMetadata("fileName")
				if data[name] then
					-- create keywords
					local photoKeyPair = {photo = photo, keywords = {}}
					for _, tag in pairs(data[name].tags) do
						local keyword = Catalog:createKeyword(tag, {}, true, importKeyword, true)
						table.insert(photoKeyPair.keywords, keyword)
					end
					--Write some metadata that shouldn't be a keyword
					if data[name].title then
						photo:setRawMetadata("title", data[name].title)
					end
					if data[name].artist then
						photo:setRawMetadata("creator", data[name].artist)
					end
					if data[name].description then
						photo:setRawMetadata("caption", data[name].description)
					end
					if data[name].submission then
						photo:setRawMetadata("creatorUrl", data[name].submission)
					end
					--take care of some categorical keywords
					if data[name].category then
						for i,v in pairs(data[name].category) do
							local categoryName = category.getName(v)
							local categoryValue = category.getValue(v)
							if categoryName == "Category" then
								--write value to the "Medium" keyword
								local categoryTypeValue = category.getSubValue(v)
								local mediumKey = Catalog:createKeyword(categoryValue, {}, true, categories.medium, true)
								local typeKey = Catalog:createKeyword(categoryTypeValue, {}, true, categories.type, true)
								table.insert(photoKeyPair.keywords, mediumKey)
								table.insert(photoKeyPair.keywords, typeKey)

							elseif categoryName == "Gender" then
								local genderKey = Catalog:createKeyword(categoryValue, {}, true, categories.gender, true)
								table.insert(photoKeyPair.keywords, genderKey)

							elseif categoryName == "Rating" then
								local ratingKey = Catalog:createKeyword(categoryValue, {}, true, categories.rating, true)
								table.insert(photoKeyPair.keywords, ratingKey)

							elseif categoryName == "Species" then
								local speciesKey = Catalog:createKeyword(categoryValue, {}, true, categories.species, true)
								table.insert(photoKeyPair.keywords, speciesKey)
							end
						end
					end
					--to do: add date uploaded to json metadata
					table.insert(photoMatches, photoKeyPair)
				end
			end)
		end

		progress:setCaption("adding keywords to photos")
		Catalog:withWriteAccessDo("writeKeywords", function()
			for i,v in pairs(photoMatches) do
				progress:setPortionComplete(i, #photoMatches)
				for _, keyword in pairs(v.keywords) do
					--Dialogs.message("Test: "..tostring(keyword))
					if keyword then --sometimes keyword creation fails, should look into cause.
						v.photo:addKeyword(keyword)
					end
				end
			end
		end)
	end)
end

function activate()
	local tagData = {}
	local tagFilePath = Dialogs.runOpenPanel({ 	--file prompt
		title = "Select a tag file",
		canChooseFiles = true,
		canChooseDirectories = true,
		allowMultipleSelection = false,
		fileTypes = "json",
	})

	if tagFilePath then --A file was selected now decode it
		local tagFile = FileUtil.readFile(tagFilePath[1])
		tagData = json.decode(tagFile)
		Tasks.startAsyncTask(Debug.showErrors(function()
			writeTagsToCatalog(tagData)
		end))
	end
end

activate()
