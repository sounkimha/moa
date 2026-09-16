import { Global, Module } from '@nestjs/common';
import { Store } from './infrastructure/store';
import { CatalogCache, MockIdentityProvider, MockPaymentProvider, MockPayoutProvider } from './infrastructure/adapters';
import { AuthController, AuthGuard, Sessions } from './auth/auth';
import { CatalogController, CatalogService } from './catalog/catalog';
import { RequestsController, RequestsService } from './requests/requests';
import { TripsController } from './trips/trips';
import { TransactionsController, TransactionsService } from './transactions/transactions';
import { ChatController } from './chat/chat';
import { MeetupController } from './meetup/meetup';
import { FlightProofController } from './trips/flight-proof';
import { OAuthController, OAuthService } from './auth/oauth';
import { FinanceController, FinanceService } from './finance/finance';
import { AdminController, AdminGuard, AdminSessions } from './admin/admin';
@Global()
@Module({
  providers: [Store, Sessions, AuthGuard, AdminSessions, AdminGuard, CatalogCache, MockPaymentProvider, MockPayoutProvider, MockIdentityProvider],
  exports: [Store, Sessions, AuthGuard, AdminSessions, AdminGuard, CatalogCache, MockPaymentProvider, MockPayoutProvider, MockIdentityProvider],
})
class InfrastructureModule {}
@Module({ controllers: [RequestsController, TripsController, FlightProofController], providers: [RequestsService] })
class MatchingModule {}
@Module({ controllers: [TransactionsController, ChatController], providers: [TransactionsService] })
class TradingModule {}
@Module({ controllers: [FinanceController], providers: [FinanceService] })
class FinanceModule {}
@Module({
  imports: [InfrastructureModule, MatchingModule, TradingModule, FinanceModule],
  controllers: [AuthController, OAuthController, CatalogController, MeetupController, AdminController],
  providers: [CatalogService, OAuthService],
})
export class AppModule {}
