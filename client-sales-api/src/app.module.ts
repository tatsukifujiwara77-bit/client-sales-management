import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { validateEnv } from './config/env.validation.js';
import { SupabaseModule } from './supabase/supabase.module.js';
import { HealthModule } from './health/health.module.js';
import { ClientsModule } from './clients/clients.module.js';
import { ClientContactsModule } from './client-contacts/client-contacts.module.js';
import { ClientNotesModule } from './client-notes/client-notes.module.js';
import { ActivitiesModule } from './activities/activities.module.js';
import { ActionItemsModule } from './action-items/action-items.module.js';
import { AlertsModule } from './alerts/alerts.module.js';
import { AlertSettingsModule } from './alert-settings/alert-settings.module.js';
import { SalesStagesModule } from './sales-stages/sales-stages.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { MapModule } from './map/map.module.js';
import { UsersModule } from './users/users.module.js';
import { OfficesModule } from './offices/offices.module.js';
import { SupabaseAuthGuard } from './common/guards/supabase-auth.guard.js';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    // AlertsServiceの毎時アラート再計算(recomputeAllOnSchedule)に必要
    ScheduleModule.forRoot(),
    SupabaseModule,
    HealthModule,
    ClientsModule,
    ClientContactsModule,
    ClientNotesModule,
    ActivitiesModule,
    ActionItemsModule,
    AlertsModule,
    AlertSettingsModule,
    SalesStagesModule,
    DashboardModule,
    MapModule,
    UsersModule,
    OfficesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // 全エンドポイントにSupabase JWT認証を適用する（@Public()を除く）
    { provide: APP_GUARD, useClass: SupabaseAuthGuard },
    // すべての例外を一貫したJSON形式で返す
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
