export interface CaptchaResponse {
  key: string
  image: string
}

export interface LoginInput {
  username: string
  password: string
  captcha_code: string
  captcha_key: string
}

export interface AuthLoginResponse {
  access_token: string
  token_type: string
}

export interface CurrentUser {
  id: number
  username: string
  email: string
  is_active: boolean
}
