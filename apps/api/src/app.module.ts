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
import { FinanceController, FinanceService } from './finance/finance';
@Global()
@Module({
  providers: [Store, Sessions, AuthGuard, CatalogCache, MockPaymentProvider, MockPayoutProvider, MockIdentityProvider],
  exports: [Store, Sessions, AuthGuard, CatalogCache, MockPaymentProvider, MockPayoutProvider, MockIdentityProvider],
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
  controllers: [AuthController, CatalogController, MeetupController],
  providers: [CatalogService],
})
export class AppModule {}
