import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthGuard } from './common';
import devConfig from './config/env/dev.config';
import { AnswerSheet, AnswerSheetSchema, Exam, ExamSchema, User, UserSchema } from './models';
import { AnswerSheetModule, AuthModule, ExamModule, ProcessingModule, UserModule } from './modules';
import { BullModule } from '@nestjs/bull';


@Module({
  imports: [
    // Bull queue configuration
    BullModule.forRoot({
      redis: {
        host: 'localhost',
        port: 6379,
      },
    }),

    ProcessingModule,

    
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
    ProcessingModule,
    AuthModule,
    UserModule,
    ExamModule,
    AnswerSheetModule,
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
