CREATE TABLE "accounts" (
	"account_id" serial PRIMARY KEY NOT NULL,
	"person_id" integer NOT NULL,
	"balance" numeric(15, 4) NOT NULL,
	"daily_withdrawal_limit" numeric(15, 4) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"account_type" integer NOT NULL,
	CONSTRAINT "account_type_range_check" CHECK ("accounts"."account_type" BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE TABLE "persons" (
	"person_id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"document" text NOT NULL,
	"birth_date" date NOT NULL,
	CONSTRAINT "persons_document_unique" UNIQUE("document")
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"transaction_id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"value" numeric(15, 4) NOT NULL,
	"transaction_date" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_person_id_persons_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."persons"("person_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_accounts_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("account_id") ON DELETE no action ON UPDATE no action;