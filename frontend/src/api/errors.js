export class ConnectionError extends Error {
  constructor(message = 'Не удалось соединиться с сервером') {
    super(message);
    this.name = 'ConnectionError';
  }
}

export class TimeoutError extends Error {
  constructor(message = 'Превышено время ожидания ответа сервера') {
    super(message);
    this.name = 'TimeoutError';
  }
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}
