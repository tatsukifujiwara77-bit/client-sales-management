import { Module } from '@nestjs/common';
import { ClientActivityCacheService } from './client-activity-cache.service.js';
import { AlertsModule } from '../../alerts/alerts.module.js';

/**
 * ActivitiesModuleとClientNotesModuleの両方から使われる共有サービス。
 * ClientsModuleがActivitiesModule/ClientNotesModuleの両方をimportしているため、
 * ここをClientsModule配下に置くと循環参照になる。独立したモジュールとして
 * common配下に置く。
 */
@Module({
  imports: [AlertsModule],
  providers: [ClientActivityCacheService],
  exports: [ClientActivityCacheService],
})
export class ClientActivityCacheModule {}
