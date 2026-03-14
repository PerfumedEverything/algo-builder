export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string }

export const successResponse = <T>(data: T): ApiResponse<T> => ({
  success: true,
  data,
})

export const errorResponse = (error: string): ApiResponse<never> => ({
  success: false,
  error,
})
