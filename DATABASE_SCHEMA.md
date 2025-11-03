# Database Schema Documentation

## Overview
This document outlines the database schema for the Time Tracking & Scheduling Application using PostgreSQL (Neon).

## Tables

### 1. Users
Stores user accounts and authentication information.

```sql
- id: UUID (Primary Key)
- email: String (Unique, Required)
- password_hash: String (Required)
- first_name: String (Required)
- last_name: String (Required)
- role: Enum (ADMIN, MANAGER, USER) (Required)
- avatar_url: String (Optional)
- is_active: Boolean (Default: true)
- created_at: Timestamp
- updated_at: Timestamp
```

### 2. Clients
Stores client/customer information.

```sql
- id: UUID (Primary Key)
- name: String (Required)
- email: String (Optional)
- phone: String (Optional)
- address: Text (Optional)
- company: String (Optional)
- notes: Text (Optional)
- is_active: Boolean (Default: true)
- created_by: UUID (Foreign Key -> Users)
- created_at: Timestamp
- updated_at: Timestamp
```

### 3. Projects
Stores project information linked to clients.

```sql
- id: UUID (Primary Key)
- name: String (Required)
- description: Text (Optional)
- client_id: UUID (Foreign Key -> Clients, Required)
- status: Enum (ACTIVE, ON_HOLD, COMPLETED, ARCHIVED) (Required)
- start_date: Date (Optional)
- end_date: Date (Optional)
- budget_hours: Decimal (Optional)
- budget_amount: Decimal (Optional)
- color: String (For calendar display, Optional)
- created_by: UUID (Foreign Key -> Users)
- created_at: Timestamp
- updated_at: Timestamp
```

### 4. ProjectMembers
Manages which users are assigned to which projects.

```sql
- id: UUID (Primary Key)
- project_id: UUID (Foreign Key -> Projects)
- user_id: UUID (Foreign Key -> Users)
- role: String (e.g., "Lead", "Developer", "Designer")
- assigned_at: Timestamp
- assigned_by: UUID (Foreign Key -> Users)
```

### 5. TimeEntries
Tracks time spent on projects (both timer and manual entries).

```sql
- id: UUID (Primary Key)
- user_id: UUID (Foreign Key -> Users, Required)
- project_id: UUID (Foreign Key -> Projects, Required)
- description: Text (Optional)
- start_time: Timestamp (Required)
- end_time: Timestamp (Optional, null if timer is running)
- duration_minutes: Integer (Calculated field)
- is_billable: Boolean (Default: true)
- is_manual_entry: Boolean (Default: false)
- created_at: Timestamp
- updated_at: Timestamp
```

### 6. Events
Stores meetings, appointments, and scheduled events.

```sql
- id: UUID (Primary Key)
- title: String (Required)
- description: Text (Optional)
- event_type: Enum (MEETING, APPOINTMENT, DEADLINE, OTHER) (Required)
- start_time: Timestamp (Required)
- end_time: Timestamp (Required)
- location: String (Optional)
- is_all_day: Boolean (Default: false)
- project_id: UUID (Foreign Key -> Projects, Optional)
- client_id: UUID (Foreign Key -> Clients, Optional)
- created_by: UUID (Foreign Key -> Users)
- recurrence_rule: JSONB (Optional, stores iCal RRULE format)
- parent_event_id: UUID (Foreign Key -> Events, for recurring event instances)
- notification_minutes_before: Integer[] (Array of minutes, e.g., [15, 60])
- color: String (Optional)
- created_at: Timestamp
- updated_at: Timestamp
```

### 7. EventAttendees
Manages which users are invited/attending events.

```sql
- id: UUID (Primary Key)
- event_id: UUID (Foreign Key -> Events)
- user_id: UUID (Foreign Key -> Users)
- status: Enum (PENDING, ACCEPTED, DECLINED, TENTATIVE) (Default: PENDING)
- created_at: Timestamp
- updated_at: Timestamp
```

### 8. TravelEntries
Tracks travel information for team members.

```sql
- id: UUID (Primary Key)
- user_id: UUID (Foreign Key -> Users, Required)
- project_id: UUID (Foreign Key -> Projects, Optional)
- client_id: UUID (Foreign Key -> Clients, Optional)
- purpose: String (Required)
- destination: String (Required)
- start_date: Date (Required)
- end_date: Date (Required)
- transportation_mode: Enum (FLIGHT, TRAIN, CAR, OTHER) (Optional)
- accommodation: String (Optional)
- estimated_expenses: Decimal (Optional)
- actual_expenses: Decimal (Optional)
- notes: Text (Optional)
- status: Enum (PLANNED, IN_PROGRESS, COMPLETED, CANCELLED) (Required)
- created_at: Timestamp
- updated_at: Timestamp
```

### 9. Notifications
Stores notifications for users (meeting reminders, etc.).

```sql
- id: UUID (Primary Key)
- user_id: UUID (Foreign Key -> Users, Required)
- title: String (Required)
- message: Text (Required)
- type: Enum (EVENT_REMINDER, SYSTEM, INFO) (Required)
- related_event_id: UUID (Foreign Key -> Events, Optional)
- is_read: Boolean (Default: false)
- scheduled_for: Timestamp (Optional, for scheduled notifications)
- sent_at: Timestamp (Optional)
- created_at: Timestamp
```

### 10. ExternalCalendarSync
Stores external calendar integration tokens and settings.

```sql
- id: UUID (Primary Key)
- user_id: UUID (Foreign Key -> Users, Required)
- provider: Enum (GOOGLE, OUTLOOK) (Required)
- access_token: Text (Encrypted, Required)
- refresh_token: Text (Encrypted, Optional)
- token_expires_at: Timestamp (Optional)
- sync_enabled: Boolean (Default: true)
- last_sync_at: Timestamp (Optional)
- created_at: Timestamp
- updated_at: Timestamp
```

### 11. AuditLogs
Tracks important actions for accountability.

```sql
- id: UUID (Primary Key)
- user_id: UUID (Foreign Key -> Users, Optional)
- action: String (Required, e.g., "CREATE_PROJECT", "DELETE_TIME_ENTRY")
- entity_type: String (Required, e.g., "Project", "TimeEntry")
- entity_id: UUID (Optional)
- details: JSONB (Optional, stores additional context)
- ip_address: String (Optional)
- created_at: Timestamp
```

## Indexes

For optimal performance, the following indexes should be created:

- Users: email (unique index)
- TimeEntries: user_id, project_id, start_time
- Events: start_time, end_time, created_by
- EventAttendees: event_id, user_id (composite unique index)
- TravelEntries: user_id, start_date, end_date
- ProjectMembers: project_id, user_id (composite unique index)
- Notifications: user_id, is_read, created_at

## Relationships

- One Client has Many Projects
- One Project has Many TimeEntries, Events, TravelEntries
- One User has Many TimeEntries, Events, TravelEntries, Notifications
- Many-to-Many: Projects and Users (through ProjectMembers)
- Many-to-Many: Events and Users (through EventAttendees)

## Data Export Views

For Excel export functionality, the following data views will be available:

1. **Time Report by Project**: TimeEntries grouped by Project with totals
2. **Time Report by User**: TimeEntries grouped by User with totals
3. **Time Report by Client**: TimeEntries grouped by Client (through Project) with totals
4. **Time Report by Date Range**: TimeEntries filtered and grouped by date
5. **Project Summary**: Projects with total time spent, budget comparison
6. **Travel Report**: TravelEntries with expenses and dates
7. **Meeting Report**: Events by type, attendees, and frequency
