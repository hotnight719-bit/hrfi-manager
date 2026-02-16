-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "manager" TEXT,
    "contact_info" TEXT,
    "rates" TEXT NOT NULL,
    "commission_type" TEXT,
    "commission_rate" DOUBLE PRECISION,
    "fee_per_person" INTEGER,
    "businessRegistrationImages" TEXT,
    "businessOwnerNames" TEXT,
    "businessRegistrationNumbers" TEXT,
    "taxInvoiceEmail" TEXT,
    "payType" TEXT DEFAULT 'INDIVIDUAL',
    "isTaxFree" BOOLEAN NOT NULL DEFAULT false,
    "teamId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Worker" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "resident_id_front" TEXT,
    "address" TEXT,
    "bank_name" TEXT,
    "bank_account" TEXT,
    "residentRegistrationNumber" TEXT,
    "bankBookImage" TEXT,
    "skill_level" TEXT NOT NULL,
    "contract_type" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Worker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkLog" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "start_time" TEXT,
    "volume_type" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT,
    "waiting_rate" DOUBLE PRECISION,
    "manualWaitingBillable" INTEGER,
    "manualWaitingWorkerPay" INTEGER,
    "unit_price" INTEGER NOT NULL,
    "total_payment_to_workers" INTEGER NOT NULL,
    "billable_amount" INTEGER NOT NULL,
    "is_billed" BOOLEAN NOT NULL DEFAULT false,
    "is_paid_to_workers" BOOLEAN NOT NULL DEFAULT false,
    "isTaxFree" BOOLEAN NOT NULL DEFAULT false,
    "isPaidFromClient" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "clientId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkLogParticipation" (
    "id" TEXT NOT NULL,
    "workLogId" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,

    CONSTRAINT "WorkLogParticipation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Team_name_key" ON "Team"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "WorkLogParticipation_workLogId_workerId_key" ON "WorkLogParticipation"("workLogId", "workerId");

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Worker" ADD CONSTRAINT "Worker_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkLog" ADD CONSTRAINT "WorkLog_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkLog" ADD CONSTRAINT "WorkLog_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkLogParticipation" ADD CONSTRAINT "WorkLogParticipation_workLogId_fkey" FOREIGN KEY ("workLogId") REFERENCES "WorkLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkLogParticipation" ADD CONSTRAINT "WorkLogParticipation_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;
