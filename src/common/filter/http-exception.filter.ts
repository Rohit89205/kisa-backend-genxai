import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Response } from 'express';
import { ResponseHelper } from '../helper/response.helper';
import { encodeValue } from '../helper/crypto.helper';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let message = 'Something went wrong';
    let tokenExpire = false;

    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (typeof exceptionResponse === 'object') {
      message = (exceptionResponse as any).message || message;
      tokenExpire = (exceptionResponse as any).tokenExpire || false;
    }

    const errorResponse = ResponseHelper.error({
      message,
      statusCode: status,
      tokenExpire,
    });

    response.status(200).json({
      value: encodeValue(errorResponse)
    });
  }
}
