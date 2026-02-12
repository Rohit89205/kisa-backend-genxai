export class ResponseHelper {
  static success({ message, data, statusCode = 200 }: any) {
    return {
      statusCode,
      success: true,
      message,
      data,
    };
  }

  static error({ message, statusCode = 500, tokenExpire = false }: any) {
    return {
      statusCode,
      success: false,
      message,
      data: null,
      tokenExpire,
    };
  }
}
