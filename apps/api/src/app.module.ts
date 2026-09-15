import { Global, Module } from '@nestjs/common';
import { Store } from './infrastructure/store';
import { CatalogCache } from './infrastructure/adapters';
import { AuthController, AuthGuard, Sessions } from './auth/auth';
import { CatalogController, CatalogService } from './catalog/catalog';
import { RequestsController, RequestsService } from './requests/requests';
import { TripsController } from './trips/trips';
import { TransactionsController, TransactionsService } from './transactions/transactions';
import { ChatController } from './chat/chat';
import { MeetupController } from './meetup/meetup';
import { FlightProofController } from './trips/flight-proof';
import { OAuthController, OAuthService } from './auth/oauth';
@Global()
@Module({
  providers: [Store, Sessions, AuthGuard, CatalogCache],
  exports: [Store, Sessions, AuthGuard, CatalogCache],
})
class InfrastructureModule {}
@Module({ controllers: [RequestsController, TripsController, FlightProofController], providers: [RequestsService] })
class MatchingModule {}
@Module({ controllers: [TransactionsController, ChatController], providers: [TransactionsService] })
class TradingModule {}
@Module({
  imports: [InfrastructureModule, MatchingModule, TradingModule],
  controllers: [AuthController, OAuthController, CatalogController, MeetupController],
  providers: [CatalogService, OAuthService],
})
export class AppModule {}
