/**
 * Faker-based value generation for JSON Schema types and property names.
 * Used to produce meaningful test data for execution run (request bodies and params).
 */

import { faker } from '@faker-js/faker';

export interface SchemaLike {
  type?: string;
  format?: string;
  minimum?: number;
  maximum?: number;
  enum?: unknown[];
  example?: unknown;
  default?: unknown;
}

/**
 * Generate a meaningful value for a schema using property name and format hints.
 * Returns null when no Faker mapping applies (caller should use example/default/fallback).
 */
export function generateFakerValue(
  schema: SchemaLike,
  propName?: string
): string | number | boolean | null {
  const type = (schema?.type as string) || 'string';
  const format = schema?.format as string | undefined;
  const name = (propName || '').toLowerCase();

  switch (type) {
    case 'string': {
      if (format === 'email' || name === 'email') return faker.internet.email();
      if (format === 'date') return faker.date.past().toISOString().slice(0, 10);
      if (format === 'date-time') return faker.date.recent().toISOString();
      if (format === 'uri' || format === 'url' || name === 'url' || name === 'image' || name === 'imageurl' || name === 'avatar')
        return faker.image.url();
      if (format === 'uuid' || name === 'id') return faker.string.uuid();
      if (name === 'password') return faker.internet.password();
      if (name === 'username' || name === 'user_name') return faker.internet.username();
      if (name === 'firstname' || name === 'first_name') return faker.person.firstName();
      if (name === 'lastname' || name === 'last_name') return faker.person.lastName();
      if (name === 'name' && !format) return faker.person.fullName();
      if (name === 'title' || name === 'productname' || name === 'product_name')
        return faker.commerce.productName();
      if (name === 'description') return faker.lorem.sentence();
      if (name === 'phone' || name === 'phonenumber') return faker.phone.number();
      if (name === 'address' || name === 'street') return faker.location.streetAddress();
      if (name === 'city') return faker.location.city();
      if (name === 'country') return faker.location.country();
      if (name === 'zipcode' || name === 'zip' || name === 'postalcode') return faker.location.zipCode();
      return faker.lorem.word();
    }
    case 'integer': {
      const min = typeof schema?.minimum === 'number' ? schema.minimum : 1;
      const max = typeof schema?.maximum === 'number' ? schema.maximum : 99999;
      return faker.number.int({ min, max: Math.max(min, max) });
    }
    case 'number': {
      const min = typeof schema?.minimum === 'number' ? schema.minimum : 0;
      const max = typeof schema?.maximum === 'number' ? schema.maximum : 1000;
      if (name === 'price' || name === 'amount' || name === 'cost')
        return parseFloat(faker.commerce.price({ min, max }));
      return faker.number.float({ min, max: Math.max(min, max), fractionDigits: 2 });
    }
    case 'boolean':
      return faker.datatype.boolean();
    default:
      return null;
  }
}

/**
 * Generate a default value for a path/query parameter using Faker when appropriate.
 */
export function generateFakerParamValue(param: {
  name?: string;
  schema?: SchemaLike;
  example?: unknown;
}): string | number | boolean | undefined {
  if (param.example !== undefined) return param.example as string | number | boolean;
  const schema = param.schema;
  if (schema?.example !== undefined) return schema.example as string | number | boolean;
  if (schema?.default !== undefined) return schema.default as string | number | boolean;

  const type = ((param.schema as SchemaLike)?.type as string) || 'string';
  const format = (param.schema as SchemaLike)?.format as string | undefined;
  const name = (param.name || '').toLowerCase();

  const fakerVal = generateFakerValue(
    { type, format, minimum: 1, maximum: 99999 },
    name || undefined
  );
  if (fakerVal !== null) return fakerVal;

  switch (type) {
    case 'integer':
    case 'number':
      return faker.number.int({ min: 1, max: 9999 });
    case 'boolean':
      return true;
    case 'string':
      return format === 'uuid' ? faker.string.uuid() : faker.string.alphanumeric(8);
    default:
      return 'test-value';
  }
}
