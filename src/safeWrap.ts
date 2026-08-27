export type SafeWrap<ErrorType = Error, DataType = unknown> =
  | [error: ErrorType, data: null]
  | [error: null, data: DataType];

export function safeWrap<ErrorType = Error, DataType = unknown>(
  callback: () => DataType,
): SafeWrap<ErrorType, DataType> {
  try {
    return [null, callback()];
  } catch (error) {
    return [error as ErrorType, null];
  }
}
