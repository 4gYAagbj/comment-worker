import { isFunction, isUndefined } from 'lodash';

class Validator {
  static async inspect(schema, fields) {
    let validatedSchema = {};
    let formattedError, rawError;
    try {
      console.log('så här långt 2')
      validatedSchema = await schema.parseAsync(fields);
      console.log('så här långt 2.5')
    } catch (validationError) {
      console.error(validationError);
      rawError = validationError;
      const result = validationError.issues.reduce(
        (obj, cur) => ({ ...obj, [cur.path.join('.')]: cur }),
        {}
      );
      formattedError = result;
    }

    return {
      rawError,
      validatedSchema,
      formattedError
    };
  }

  static async check(schema, fields, errorOverride = undefined) {
    const inspectionResults = await Validator.inspect(schema, fields);
    const { formattedError, rawError } = inspectionResults;
    if (!isUndefined(formattedError)) {
      if (!isUndefined(errorOverride) && isFunction(errorOverride)) {
        errorOverride();
      } else {
        throw new Error(rawError);
      }
    }
    
    return inspectionResults;
  }
}

export default Validator;
