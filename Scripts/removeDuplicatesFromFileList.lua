require'lfs'
local JSON = require("json")

function getFilesInDir(dir)
    local files = {}
    for file in lfs.dir(dir) do
        files[file] = true
    end
    return files
end

local existingFiles = getFilesInDir([[E:\]])

function getSubmissionImages(json)
    local file = io.open(json, "r")
    local json = file:read("*all")

    local imageData  = JSON.decode(json)

    local images = {}
    for fileName, metadata in pairs(imageData) do
        if not existingFiles[metadata.image:match("[^/]+$")] then
            table.insert(images, metadata.image)
        end
    end
    print(#images)
    return table.concat(images, "\n")
end


print(getSubmissionImages([[E:\a.json]]))
