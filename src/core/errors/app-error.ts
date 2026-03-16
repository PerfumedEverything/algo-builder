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
    return new AppError("Необходима авторизация", 401)
  }

  static forbidden() {
    return new AppError("Доступ запрещён", 403)
  }

  static notFound(entity: string) {
    return new AppError(`${entity} не найден`, 404)
  }

  static internal(message = "Внутренняя ошибка сервера") {
    return new AppError(message, 500)
  }
}
