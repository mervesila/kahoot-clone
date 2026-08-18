import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { authInterceptor } from './services/auth.interceptor';
import { ApiService } from './services/api.service';
import { MockApiService } from './services/mock-api.service';
import { RelayEventHandler } from './services/relay-event-handler.service';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideAnimationsAsync(),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    provideRouter(routes),
    environment.demo ? { provide: ApiService, useClass: MockApiService } : ApiService,
    environment.demo ? RelayEventHandler : [],
  ],
};
