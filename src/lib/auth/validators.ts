import { PASSWORD_RULES, USERNAME_RULES } from "./constants";

export function validateUsername(username: string): string | null {
  if (!username) return "ユーザーネームを入力してください";
  if (username.length < USERNAME_RULES.minLength) {
    return `ユーザーネームは${USERNAME_RULES.minLength}文字以上にしてください`;
  }
  if (username.length > USERNAME_RULES.maxLength) {
    return `ユーザーネームは${USERNAME_RULES.maxLength}文字以下にしてください`;
  }
  if (!USERNAME_RULES.pattern.test(username)) {
    return "ユーザーネームは英数字・ハイフン・アンダースコアのみ使用できます";
  }
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return "パスワードを入力してください";
  if (password.length < PASSWORD_RULES.minLength) {
    return `パスワードは${PASSWORD_RULES.minLength}文字以上にしてください`;
  }
  if (PASSWORD_RULES.requireLetter && !/[A-Za-z]/.test(password)) {
    return "パスワードには英字を1文字以上含めてください";
  }
  if (PASSWORD_RULES.requireDigit && !/\d/.test(password)) {
    return "パスワードには数字を1文字以上含めてください";
  }
  return null;
}
