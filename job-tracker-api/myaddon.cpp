#include <napi.h>
#include <string>

Napi::String ParseEmail(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  // Проверка входного аргумента: должен быть хотя бы один аргумент и он должен быть строкой
  if (info.Length() < 1 || !info[0].IsString()) {
    Napi::TypeError::New(env, "Ожидается строка в качестве первого аргумента").ThrowAsJavaScriptException();
    return Napi::String::New(env, "");
  }
  
  std::string email = info[0].As<Napi::String>().Utf8Value();
  std::string result = "Parsed email: " + email;
  
  return Napi::String::New(env, result);
}

// Инициализация модуля: добавляем функцию "parseEmail" в экспортируемый объект
Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set(Napi::String::New(env, "parseEmail"),
              Napi::Function::New(env, ParseEmail));
  return exports;
}

NODE_API_MODULE(myaddon, Init)
