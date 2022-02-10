const Ajv = require("ajv/dist/2020");
const ajv = new Ajv();

const nestedSchema = require("../zowe-schema.json");

// validate nested schema before trying to convert
ajv.compile(nestedSchema);

printSchema(nestedSchema, "NESTED SCHEMA");

const { properties, ...flatSchema } = nestedSchema;
const flatProperties = flattenProperties(properties);


flatSchema.properties = flatProperties;

printSchema(flatSchema, "FLAT SCHEMA");

function flattenProperties(properties, parentKey = "") {
    let flatProperties = {}
    for (const [propKey, prop] of Object.entries(properties)) {
        const keyPrefix = parentKey ? `${parentKey}.` : "" // ensure no leading .
        if (prop.type === "object") {
            flatProperties = {...flatProperties, ...flattenProperties(prop.properties, `${keyPrefix}${propKey}`) };
        } else {
            flatProperties = {...flatProperties, [`${keyPrefix}${propKey}`]: prop }
        }
    }
    return flatProperties;
}

function printSchema(schema, name = "") {
    console.log(`~~~~~~~~~~~~~~~${name ? ' ' + name + ' ' : '~~'}~~~~~~~~~~~~~~~~`);
    console.log(JSON.stringify(schema, null, 4));
    console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
}