export class AppError extends Error {
  constructor(
    public override message: string,
    public statusCode: number,
  ) {
    super(message)
    this.name = "AppError"
  }

  static badRequest(message: string) {
    return new AppError(message, 400)
  }

  static unauthorized() {
    return new AppError("Unauthorized", 401)
  }

  static forbidden() {
    return new AppError("Forbidden", 403)
  }

  static notFound(entity: string) {
    return new AppError(`${entity} not found`, 404)
  }

  static internal(message = "Internal server error") {
    return new AppError(message, 500)
  }
}
