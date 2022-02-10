const Ajv = require("ajv/dist/2020");
const ajv = new Ajv();

const nestedSchema = require("../zowe-schema.json");

// validate nested schema before trying to convert
ajv.compile(nestedSchema);

printSchema(nestedSchema, "NESTED SCHEMA");

const { properties, ...flatSchema } = nestedSchema;

// resolve $ref references so they can be flattened
const resolvedProperties = resolveReferences(properties, nestedSchema);
printSchema(resolvedProperties, "RESOLVED");
printSchema(properties, "ORIGINAL")

function resolveReferences(properties, schema) {
    let resolvedProperties = {};
    for (const [k, prop] of (Object.entries(properties))) {
        console.log(k);
        if (prop.properties) {
            const r = resolveReferences(prop.properties, schema);
            printSchema(r, "RECUR RESULT")
            const res = { ...prop.properties, ...r };
            printSchema(res, "RECUR BUILT RESULT");
            resolvedProperties = { ...resolvedProperties, ...res };
            printSchema(resolvedProperties, "RECURSION");
        }

        if (prop["$ref"]) {
            const r = getReferencedObject(prop["$ref"], schema);
            printSchema(r, "REFERENCE")
            const resolvedProp = {...prop, ...r}
            printSchema(resolvedProp, "RESOLVED PROP")
            resolvedProperties[k] = { ...resolvedProperties[k], ...resolvedProp };
            printSchema(resolvedProperties, "ref")
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

const flatProperties = flattenProperties(resolvedProperties);
flatSchema.properties = flatProperties;

printSchema(flatSchema, "FLAT SCHEMA");

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