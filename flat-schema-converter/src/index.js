const Ajv = require("ajv/dist/2020");
const ajv = new Ajv();

const nestedSchema = require("../zowe-schema.json");

// validate nested schema before trying to convert
ajv.compile(nestedSchema);
const { properties, ...flatSchema } = nestedSchema;

// resolve $ref references so they can be flattened
const resolvedProperties = resolveReferences(properties, nestedSchema);

const flatProperties = flattenProperties(resolvedProperties);
flatSchema.properties = flatProperties;

printSchema(flatSchema, "FLATTENED");

function resolveReferences(properties, schema) {
    let resolvedProperties = {};
    for (const [k, prop] of (Object.entries(properties))) {
        if (prop.properties) {
            const resolved = { ...prop.properties, ...resolveReferences(prop.properties, schema) };
            resolvedProperties = { ...resolvedProperties, ...resolved };
        }

        if (prop["$ref"]) {
            const resolved = {...prop, ...getReferencedObject(prop["$ref"], schema)}
            resolvedProperties[k] = { ...resolvedProperties[k], ...resolved };
        }
    }
    return resolvedProperties;
}

function getReferencedObject(link, schema) {
    const resolvePath = link.split('/');
    if (resolvePath[0] === '#') {
        resolvePath.shift();
    }

    let resolvedObject = Object.assign({}, schema);
    for (const p of resolvePath) {
        if (resolvedObject[p]) {
            resolvedObject = resolvedObject[p];
        } else {
            return null;
        }
    }

    return resolvedObject;
}

function flattenProperties(properties, parentKey = "") {
    let flatProperties = {};
    for (const [propKey, prop] of Object.entries(properties)) {
        const keyPrefix = parentKey ? `${parentKey}.` : "" // ensure no leading '.'
        if (prop.type === "object") {
            flatProperties = { ...flatProperties, ...flattenProperties(prop.properties, `${keyPrefix}${propKey}`) };
        } else {
            flatProperties = { ...flatProperties, [`${keyPrefix}${propKey}`]: prop };
        }
    }
    return flatProperties;
}

function printSchema(schema, name = "") {
    console.log(`~~~~~~~~~~~~~~~${name}~~~~~~~~~~~~~~~~`);
    console.log(JSON.stringify(schema, null, 4));
    console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
}