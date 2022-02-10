const Ajv = require("ajv/dist/2020");
const ajv = new Ajv();

const nestedSchema = require("../zowe-schema.json");

// validate nested schema before trying to convert
ajv.compile(nestedSchema);

printSchema(nestedSchema, "NESTED SCHEMA");

const { properties, ...flatSchema } = nestedSchema;
printSchema(properties, "PROPERTIES")
const flatProperties = flattenProperties(properties);
flatSchema.properties = flatProperties;

printSchema(flatSchema, "FLAT SCHEMA");

function flattenProperties(properties, parentKey = "") {
    let flatProperties = {}
    for (const [propKey, prop] of Object.entries(properties)) {
        if (prop.type === "object") {
            flatProperties = {...flatProperties, ...flattenProperties(prop.properties, `${parentKey}.${propKey}`) };
        } else {
            flatProperties = {...flatProperties, [`${parentKey}.${propKey}`]: prop }
        }
    }
    return flatProperties;
}

function printSchema(schema, name = "") {
    console.log(`~~~~~~~~~~~~~~~${name ? ' ' + name + ' ' : '~~'}~~~~~~~~~~~~~~~~`);
    console.log(JSON.stringify(schema, null, 4));
    console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
}