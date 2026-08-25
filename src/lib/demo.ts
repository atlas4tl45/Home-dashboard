// Demo mode (open the app with `?demo`): a sample home so the dashboard can
// be previewed — and screenshotted — without a Home Assistant instance.
// Service calls are applied optimistically to the local state so tiles,
// locks and the alarm all feel real.

import type { HassEntities, HassEntity } from "home-assistant-js-websocket";
import type { Registry } from "@/lib/ha";

const STAMP = "2026-01-01T00:00:00.000Z";

function ent(
  entity_id: string,
  state: string,
  attributes: Record<string, unknown> = {},
): HassEntity {
  return {
    entity_id,
    state,
    attributes,
    last_changed: STAMP,
    last_updated: STAMP,
    context: { id: "demo", user_id: null, parent_id: null },
  } as HassEntity;
}

const dimmable = { supported_color_modes: ["brightness"] };
const tunable = { supported_color_modes: ["color_temp", "hs"] };

const list: HassEntity[] = [
  // Living room
  ent("light.ceiling", "on", {
    friendly_name: "Ceiling Lights",
    brightness: 200,
    ...tunable,
  }),
  ent("light.floor_lamp", "on", {
    friendly_name: "Floor Lamp",
    brightness: 120,
    ...dimmable,
  }),
  ent("fan.ceiling_fan", "on", { friendly_name: "Ceiling Fan", percentage: 50 }),
  ent("switch.tv_outlet", "off", {
    friendly_name: "TV Outlet",
    device_class: "outlet",
  }),
  ent("sensor.living_temp", "72", {
    friendly_name: "Living Room Temperature",
    device_class: "temperature",
  }),
  ent("binary_sensor.living_motion", "off", {
    friendly_name: "Motion",
    device_class: "motion",
  }),

  // Kitchen
  ent("light.kitchen_spots", "off", { friendly_name: "Spotlights", ...dimmable }),
  ent("light.island", "on", {
    friendly_name: "Island Pendants",
    brightness: 255,
    ...tunable,
  }),
  ent("sensor.kitchen_temp", "74", {
    friendly_name: "Kitchen Temperature",
    device_class: "temperature",
  }),

  // Bedroom
  ent("light.bedside", "off", { friendly_name: "Bedside Lamps", ...tunable }),
  ent("climate.bedroom", "cool", {
    friendly_name: "Thermostat",
    current_temperature: 71,
    temperature: 68,
    target_temp_step: 1,
    hvac_modes: ["off", "heat", "cool", "heat_cool"],
  }),
  ent("cover.bedroom_shades", "open", {
    friendly_name: "Shades",
    current_position: 80,
    supported_features: 15,
  }),
  ent("sensor.bedroom_temp", "70", {
    friendly_name: "Bedroom Temperature",
    device_class: "temperature",
  }),

  // Office
  ent("light.office", "off", { friendly_name: "Office Light", ...dimmable }),
  ent("fan.office_fan", "off", { friendly_name: "Desk Fan", percentage: 0 }),

  // Entry
  ent("lock.front_door", "locked", { friendly_name: "Front Door" }),
  ent("lock.back_door", "unlocked", { friendly_name: "Back Door" }),
  ent("binary_sensor.front_door", "off", {
    friendly_name: "Front Door",
    device_class: "door",
  }),
  ent("binary_sensor.patio_door", "on", {
    friendly_name: "Patio Door",
    device_class: "door",
  }),
  ent("binary_sensor.kitchen_window", "off", {
    friendly_name: "Kitchen Window",
    device_class: "window",
  }),

  // Whole home
  ent("alarm_control_panel.home", "disarmed", {
    friendly_name: "Alarm",
    code_format: "number",
    code_arm_required: false,
    supported_features: 7,
  }),
  ent("weather.home", "partlycloudy", {
    friendly_name: "Weather",
    temperature: 71,
    temperature_unit: "°F",
  }),
  ent("scene.good_morning", "off", { friendly_name: "Good Morning" }),
  ent("scene.movie_night", "off", { friendly_name: "Movie Night" }),
  ent("scene.all_off", "off", { friendly_name: "All Off" }),
];

export const demoEntities: HassEntities = Object.fromEntries(
  list.map((e) => [e.entity_id, e]),
);

const areaOf: Record<string, string> = {
  "light.ceiling": "living",
  "light.floor_lamp": "living",
  "fan.ceiling_fan": "living",
  "switch.tv_outlet": "living",
  "sensor.living_temp": "living",
  "binary_sensor.living_motion": "living",
  "light.kitchen_spots": "kitchen",
  "light.island": "kitchen",
  "sensor.kitchen_temp": "kitchen",
  "binary_sensor.kitchen_window": "kitchen",
  "light.bedside": "bedroom",
  "climate.bedroom": "bedroom",
  "cover.bedroom_shades": "bedroom",
  "sensor.bedroom_temp": "bedroom",
  "light.office": "office",
  "fan.office_fan": "office",
  "lock.front_door": "entry",
  "lock.back_door": "entry",
  "binary_sensor.front_door": "entry",
  "binary_sensor.patio_door": "entry",
};

export const demoRegistry: Registry = {
  areas: [
    { area_id: "living", name: "Living Room" },
    { area_id: "kitchen", name: "Kitchen" },
    { area_id: "bedroom", name: "Bedroom" },
    { area_id: "office", name: "Office" },
    { area_id: "entry", name: "Entry" },
  ],
  entityArea: areaOf,
  hiddenEntities: new Set(),
};

// The dashboard is opt-in, so the demo ships a pre-curated setup: rooms
// built from the sample home plus the alarm/weather/scene selections.
export const demoCustomRooms = demoRegistry.areas.map((area) => ({
  id: `room:${area.area_id}`,
  name: area.name,
  entityIds: Object.entries(areaOf)
    .filter(([, areaId]) => areaId === area.area_id)
    .map(([entityId]) => entityId),
}));

export const demoFeatures = {
  alarm: "alarm_control_panel.home",
  weather: "weather.home",
  scenes: ["scene.good_morning", "scene.movie_night", "scene.all_off"],
};

/** Apply a service call to the demo state, returning the updated entities. */
export function applyDemoService(
  entities: HassEntities,
  domain: string,
  service: string,
  data: Record<string, unknown> | undefined,
  entityId: string | undefined,
): HassEntities {
  if (!entityId) return entities;
  const entity = entities[entityId];
  if (!entity) return entities;

  const patch = (state: string, attrs: Record<string, unknown> = {}) => ({
    ...entities,
    [entityId]: {
      ...entity,
      state,
      attributes: { ...entity.attributes, ...attrs },
    },
  });

  const on = entity.state === "on";
  switch (`${domain}.${service}`) {
    case "light.turn_on":
      return patch("on", {
        brightness:
          data?.brightness_pct != null
            ? Math.round(((data.brightness_pct as number) / 100) * 255)
            : (entity.attributes.brightness ?? 255),
      });
    case "light.turn_off":
    case "fan.turn_off":
    case "switch.turn_off":
      return patch("off");
    case "light.toggle":
      return on ? patch("off") : patch("on", { brightness: 255 });
    case "switch.toggle":
    case "fan.toggle":
      return patch(on ? "off" : "on", domain === "fan" ? { percentage: 60 } : {});
    case "fan.set_percentage": {
      const pct = (data?.percentage as number) ?? 0;
      return patch(pct === 0 ? "off" : "on", { percentage: pct });
    }
    case "cover.toggle":
    case "cover.set_cover_position": {
      const pos =
        service === "toggle"
          ? entity.state === "open"
            ? 0
            : 100
          : ((data?.position as number) ?? 0);
      return patch(pos === 0 ? "closed" : "open", { current_position: pos });
    }
    case "climate.set_temperature":
      return patch(entity.state, { temperature: data?.temperature });
    case "climate.set_hvac_mode":
      return patch((data?.hvac_mode as string) ?? entity.state);
    case "lock.lock":
      return patch("locked");
    case "lock.unlock":
      return patch("unlocked");
    case "alarm_control_panel.alarm_disarm":
      return patch("disarmed");
    case "alarm_control_panel.alarm_arm_home":
      return patch("armed_home");
    case "alarm_control_panel.alarm_arm_away":
      return patch("armed_away");
    case "alarm_control_panel.alarm_arm_night":
      return patch("armed_night");
    default:
      return entities;
  }
}
