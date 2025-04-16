-- Profil minimal pour un véhicule en France adapté pour OSRM
-- Fonction appelée pour chaque nœud (aucun traitement particulier ici)
function node_function(node)
    return
end

-- Fonction appelée pour chaque voie (way)
function way_function(way, result)
    if not way.tags then
        return
    end

    local highway = way.tags["highway"]
    if highway == nil then
        return
    end

    -- Liste des types de routes acceptés
    local valid_highways = {
        motorway = true,
        trunk = true,
        primary = true,
        secondary = true,
        tertiary = true,
        residential = true,
        unclassified = true,
        service = true,
        living_street = true
    }
    if not valid_highways[highway] then
        return
    end

    -- Définir une vitesse par défaut (en km/h) selon le type de route
    local speed = 50 -- valeur par défaut pour les autres
    if highway == "motorway" then
        speed = 110
    elseif highway == "trunk" then
        speed = 90
    elseif highway == "primary" then
        speed = 80
    elseif highway == "secondary" then
        speed = 70
    elseif highway == "tertiary" then
        speed = 60
    elseif highway == "residential" then
        speed = 50
    elseif highway == "living_street" then
        speed = 20
    end

    -- Si un tag maxspeed est présent, on prend la valeur numérique (en km/h)
    if way.tags["maxspeed"] then
        local ms = tonumber(way.tags["maxspeed"])
        if ms and ms > 0 then
            -- On choisit le minimum entre la valeur par défaut et le maxspeed indiqué
            speed = math.min(speed, ms)
        end
    end

    -- Si la voie est marquée comme à péage, on réduit la vitesse
    if way.tags["toll"] and way.tags["toll"]:lower() == "yes" then
        speed = speed * 0.7
    end

    -- Affecter les vitesses et les modes dans les deux directions
    result.forward_speed = speed
    result.backward_speed = speed
    result.forward_mode = "driving"
    result.backward_mode = "driving"

    -- OSRM fournit la distance calculée (en mètres)
    result.distance = way.distance
    result.duration = way.distance / (speed / 3.6) -- conversion km/h en m/s

    result.weight_name = "routability"
end

-- Fonction pour le traitement des tournants (dans notre cas, retour du texte passé)
function turn_function(instruction)
    return instruction
end

-- Retourne la configuration finale du profil
return {
    properties = {
        weight_name = "routability",
        process_call_tagless_node = false
    },
    default_mode = "driving",
    node_function = node_function,
    way_function = way_function,
    turn_function = turn_function,
    classes = {"toll", "ferry", "tunnel"},
    toll_booth_cost = 15,
    max_speed_for_map_matching = 130
}
