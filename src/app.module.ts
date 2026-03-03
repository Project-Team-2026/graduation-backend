import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule, UserModule } from './modules';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import devConfig from './config/env/dev.config';
import { User, UserSchema , Exam, ExamSchema, AnswerSheet, AnswerSheetSchema} from './models';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './common';
import { ExamModule } from './modules/exam/exam.module';


@Module({
  imports: [
    // Load configuration files
    ConfigModule.forRoot({
      load: [devConfig],
      isGlobal: true,
    }),

    // Connect to database
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get('database').url,
      }),
    }),

    // Register mongoose modules
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Exam.name, schema: ExamSchema },
      { name: AnswerSheet.name, schema: AnswerSheetSchema },

    ]),

    // Register application modules
    AuthModule,
    UserModule,
    ExamModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AppModule {}
