local watching = {}
local favorites = {}

function parseWatchList(list)
    local parsed = {}
    for artist in list.gmatch(".+") do
        table.insert(parsed, artist)
    end
end

function findArtistsNotWatched(gallery)
    for fileName, submission in pairs(gallery) do
    if not watching[submission.artist] then

    end
end
