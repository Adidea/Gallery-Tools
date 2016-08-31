local JSON = require("json")

function getSubmissionImages(json)
    local file = io.open(json, "r")
    local json = file:read("*all")

    local imageData  = JSON.decode(json)

    local images = {}
    for fileName, metadata in pairs(imageData) do
        table.insert(images, metadata.image)
    end
    return table.concat(images, "\n")
end

function createTextFile(str)
    print(str)
    local file = io.open("imageLinks.txt", "w+")
    file:write(str)
    file:close()
end

function getFileInput() --opens a console that accepts a file path, best for drag/drop.
    io.write("Enter file path or drop file here...")
    local input = io.read()
    --work this out later...
end

createTextFile(getSubmissionImages([[E:\urst\sr\p\art\DaminionTools\DifetraFavorites2.json]]))
