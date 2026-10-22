export interface ApiSuccess<T> {
  status: "success";
  message: string;
  data: T;
}

export interface ApiError {
  status: "error";
  message: string;
}

export function successResponse<T>(message: string, data: T): ApiSuccess<T> {
  return { status: "success", message, data };
}

export function errorResponse(message: string): ApiError {
  return { status: "error", message };
}
