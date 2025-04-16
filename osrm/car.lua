-- Ajout de types de routes spécifiques à la France
local toll_roads = {
    ["motorway"] = true,
    ["trunk"] = true
}

function way_function(way, result)
    local highway = way:get_value_by_key("highway")
    if not highway then
        return
    end

    -- Gestion des péages
    local toll = way:get_value_by_key("toll") == "yes" or toll_roads[highway]

    -- Vitesses adaptées à la réglementation française
    local speeds = {
        motorway = 130,
        trunk = 110,
        primary = 90,
        secondary = 80,
        tertiary = 70,
        residential = 50,
        ["living_street"] = 20,
        ["service"] = 30
    }

    result.forward_speed = speeds[highway] or 50
    result.backward_speed = speeds[highway] or 50

    -- Marquer les routes à péage
    if toll then
        result.forward_mode = 1
        result.backward_mode = 1
        result.forward_rate = 0.7 -- Pénalité pour routes à péage
        result.backward_rate = 0.7
    end

    -- Gestion des sens interdits
    local oneway = way:get_value_by_key("oneway")
    if oneway == "-1" then
        result.forward_mode = 0
    elseif oneway == "yes" then
        result.backward_mode = 0
    end
end
