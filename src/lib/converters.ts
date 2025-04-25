import { UNITS } from "./constants";
import { fix_regex, round, equals, is_number } from "./utils";

interface IDef {
  regex: RegExp,
  alias?: string,
  singular?: string,
  plural?: string,
  unit?: string,
  join?: boolean,
  skip?: boolean,
  ignore_scale?: boolean,
  converters?: {
    [key: string]: (value: number) => string | number
  }
};

export const defs: { [key: string]: IDef } = {
  teaspoon: {
    regex: /^teaspoon[s]?$/i,
    alias: "tsp",
  },
  stick: {
    regex: /^stick[s]?$/i,
    singular: "stick",
    plural: "sticks",
    unit: UNITS.ANY,
  },
  lb: {
    regex: /^lb[s]?$/i,
    singular: "lb",
    plural: "lbs",
    unit: UNITS.IMPERIAL,
  },
  tablespoon: {
    regex: /^tablespoon[s]?$/i,
    alias: "tbsp",
  },
  tbsp: {
    regex: /^tbsp[s]?$/i,
    singular: "tbsp",
    unit: UNITS.IMPERIAL,
    converters: {
      ml: (value: number) => value * 14.787,
    },
  },
  tsp: {
    regex: /^tsp[s]?$/i,
    singular: "tsp",
    unit: UNITS.IMPERIAL,
    converters: {
      ml: (value: number) => value * 4.929,
    },
  },
  oz: {
    regex: /^oz[s]?$/i,
    singular: "oz",
    unit: UNITS.METRIC,
  },
  ml: {
    regex: /^ml[s]?$/i,
    singular: "ml",
    unit: UNITS.METRIC,
    converters: {
      cup: (value: number) => round(value / 236.6, 1),
    },
  },
  grams: {
    regex: /^g[s]?$/i,
    singular: "g",
    plural: "g",
    join: true,
    unit: UNITS.METRIC,
  },
  cm: {
    regex: /^cm[s]?$/i,
    singular: "cm",
    unit: UNITS.METRIC,
    converters: {
      inch: (value: number) => value / 2.54,
    },
  },
  celsius: {
    regex: /°C?$/i,
    singular: "°C",
    unit: UNITS.METRIC,
    join: true,
    ignore_scale: true,
    converters: {
      fahrenheit: (value: number) => (value * 9) / 5 + 32,
    },
  },
  fahrenheit: {
    regex: /°F?$/i,
    singular: "°F",
    unit: UNITS.IMPERIAL,
    join: true,
    ignore_scale: true,
    converters: {
      celsius: (value: number) => ((value - 32) * 5) / 9,
    },
  },
  cup: {
    regex: /^cup[s]?$/i,
    singular: "cup",
    plural: "cups",
    unit: UNITS.IMPERIAL,
    converters: {
      ml: (value: number) => value * 236.5882365,
    },
  },
  quart: {
    regex: /^quart[s]?$/i,
    singular: "quart",
    plural: "quarts",
    unit: UNITS.IMPERIAL,
  },
  ounce: {
    regex: /^ounce[s]?$/i,
    singular: "ounce",
    plural: "ounces",
    unit: UNITS.METRIC,
  },
  inch_alt: {
    regex: /^inch(?:es)?$/i,
    alias: "inch",
  },
  inch: {
    regex: /^"$/i,
    singular: " inch",
    plural: " inche",
    join: true,
    unit: UNITS.IMPERIAL,
    converters: {
      cm: (value: number) => value * 2.54,
    },
  },
  hour: {
    regex: /hour[s]?$/i,
    skip: true,
  },
  minute: {
    regex: /minute[s]?$/i,
    skip: true,
  },
  day: {
    regex: /day[s]?$/i,
    skip: true,
  },
};


export function convert(def: IDef, value: number, units: string, quantity: number): string | null {
  if (def.alias) {
    def = defs[def.alias];
  }

  let new_value: string | number = value * quantity;
  if (def.ignore_scale) {
    new_value = value;
  }

  if (
    !(units === UNITS.ANY || units === UNITS.ORIGINAL) &&
    units !== def.unit
  ) {
    if (def.converters) {
      let converter_key = Object.keys(def.converters)[0];
      new_value = def.converters[converter_key](new_value);
      def = defs[converter_key];
    } else {
      return null;
    }
  }

  new_value = round(new_value, 2, true);
  if (!def.plural || typeof new_value === "string" || new_value <= 1.1) {
    if (def.join) {
      return `${new_value}${def.singular}`;
    }
    return `${new_value} ${def.singular}`;
  }

  if (def.join) {
    return `${new_value}${def.plural}`;
  }
  return `${new_value} ${def.plural}`;
}

export function try_convert_and_resize(
  text: string,
  quantity: number,
  units: string,
): string | null {
  if (is_number(text)) {
    // Special case: if this is the original quantity/units, then don't mark
    // the field as being an error. Just keep showing the original.
    if (equals(quantity, 1) && units === UNITS.ORIGINAL) {
      return text;
    }
    return null;
  }

  for (let def of Object.values(defs)) {
    if (def.regex.exec(text) != null) {
      if (def.skip) {
        return text;
      }
    }
  }

  let fix_match = (match: string): string | number => {
    match = match.trim();
    if (is_number(match)) {
      return Number(match);
    }

    let matches = match.match(/^([0-9]+)\/([0-9]+)$/);
    if (matches) {
      return Number(matches[1]) / Number(matches[2]);
    }

    matches = match.match(/^([0-9])\s([0-9]+)\/([0-9]+)$/);
    if (matches) {
      return Number(matches[1]) + Number(matches[2]) / Number(matches[3]);
    }

    return NaN;
  };

  text = text.replace(/ and /, " ");

  let matches: any = text.match(
    new RegExp(
      fix_regex(
        String.raw`
					// Number and space prefix
					(?:[0-9]+ )?

					// Decimal prefix
					(?:\.[0-9]+)*

					// Some number
					[0-9]+

					// number-[other number]
					(?:\s*[\/-]\s*[0-9]+)*

					// number and [other number]
					(?: and [0-9]+)?

					(?:\/[0-9]+)*

					// Decimal suffix
					(?:\.[0-9]+)*`,
      ),
      "gi",
    ),
  );

  if (matches == null) {
    // Special case: if this is the original quantity/units, then don't mark
    // the field as being an error. Just keep showing the original.
    if (equals(quantity, 1) && units === UNITS.ORIGINAL) {
      return text;
    }
    return null;
  }

  let original = text;
  for (let i = 0; i < matches.length; i++) {
    let match = matches[i];
    matches[i] = fix_match(match);
    text = text.replace(match, "").trim();
  }

  let value = matches.reduce((acc: any, match: any) => acc + match, 0);
  if (value < 0 || isNaN(value)) {
    // Special case: if this is the original quantity/units, then don't mark
    // the field as being an error. Just keep showing the original.
    if (equals(quantity, 1) && units === UNITS.ORIGINAL) {
      return original;
    }
    return null;
  }

  for (let def of Object.values(defs)) {
    if (def.regex.exec(text) != null) {
      let final_value = convert(def, value, units, quantity);
      if (final_value) {
        return final_value;
      }
    }
  }

  return null;
};

