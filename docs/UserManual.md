# User Manual

## Sidebar navigation
Users with `ADMIN` role see an `Admin` submenu in the left sidebar. It contains these direct links:
- `User Management`
- `Room/Desk Management`
- `Booking Management`
- `Booking Settings`

In the admin procedures below, paths like `Admin` -> `User Management` mean: open the `Admin` submenu in the sidebar and select that section directly.

## User management
### Add new user
After you executed initDatabase.sh you can login as test.admin@mail.de with the password test. With this account you can start to add your real users. It is important that, after you setup your real world users, you delete all test users with their unsafe passwords. See [DefaultTestUsers.md](DefaultTestUsers.md) for a complete list of test accounts.

A step by step guide how to add a new user is seen in the following list:

1. Login as user with ADMIN role.
2. Open `Admin` -> `User Management` in the left sidebar.
3. Click on `Add User`.
4. Provide the user's `Email`, a default `Password`, `Name`, and `Surname`.
5. (Optional) Provide a `Department`.
6. Select the user's role(s):
   - If the user should be an admin, set `Admin` to `True`. (Admins inherit Employee and Service Personnel permissions via role hierarchy.)
   - If the user is not an admin, select at least one of: `Employee`, `Service Personnel`. (Both can be selected.)
7. Click `Submit`.
8. A small window will appear with the information that the user was created successfully.

Notes:
- Email addresses are validated. Only valid email formats are accepted.
- New users are active by default.

### Delete user
1. Login as user with ADMIN role.
2. Open `Admin` -> `User Management` in the left sidebar.
3. Click on `Delete User`.
4. (Optional) For a faster search enable filter:
   - Turn on `Enable Filter`.
   - Choose a `Column` (e.g., Email), choose a `Condition` (`contains` or `is equal`), and enter text.
   - You can add multiple filters and choose whether to match `All` or `Any` filters.
5. Click `DELETE` for the selected user. You will be asked to confirm the deletion.
6. If the user has done at least one booking a window will appear. You will be asked to delete all bookings that belong to the user. Click `YES`.
7. A small window will appear with the information that the user was deleted.

Tip: Some columns are boolean and can be filtered with `True/False` (e.g., Activity and MFA).

### Deactivate / Reactivate user
Deactivating a user locks them out of the system without deleting their account (soft lockout). Their history and data are retained, and they can be reactivated later.

1. Login as user with ADMIN role.
2. Open `Admin` -> `User Management` in the left sidebar.
3. Click on `Deactivate/Reactivate User`.
4. (Optional) Use the filter to find the target user (see the filtering notes in the Delete section).
5. Click `DEACTIVATE` to lock the account, or `REACTIVATE` to restore access.
6. A confirmation prompt appears before the action is applied.

Notes:
- Deactivated users appear with Activity = `deactivated` and are shown at the bottom of the user table.
- Deactivated users cannot log in until reactivated.

### Roles and changes for users
A basic role hierarchy is implemented:
- `ROLE_ADMIN` inherits permissions from `ROLE_EMPLOYEE` and `ROLE_SERVICE_PERSONNEL`.
- Non-admin users must have at least one of: Employee, Service Personnel (or both).

Admins can manage user properties via the `Admin` sidebar sections (email, name, surname, department, roles) and can additionally perform administrative actions like password resets and account deactivation.

To edit a user's roles or profile:
1. Login as user with ADMIN role.
2. Open `Admin` -> `User Management` in the left sidebar.
3. Click on `Edit User`.
4. (Optional) Enable filter and search for the user by Email (or other fields). You can add multiple filters and match `All`/`Any`.
5. Click on `EDIT` for the selected user.
6. Update the user's attributes (email, name, surname, department, and roles). Email format is validated.
7. (Optional) Click `Reset Password` and enter the new password twice to confirm the reset.
8. Click `Update`.
9. A small window will appear with the information that the user was changed.

MFA notes (admins only):
- Admins can enable/disable MFA for their own account under `Settings` -> `MFA Settings`.
- If an admin is locked out due to MFA, another admin can disable MFA for that user via the admin user table (recovery flow).

## Room and desk management
### Create a new room
A room contains desks/workstations. A room is located in a floor. For the following guide we assume that the floor (and therefore the building) are already added.

1. Login as user with ADMIN role.
2. Open `Admin` -> `Room/Desk Management` in the left sidebar.
3. Click on `Add Room`.
4. Choose a building and a floor. Click on the image where the new room is located.
5. Select the roomy type, the status and a optional room remark. The remark will be shown when you hover over the room icon in the image.
6. Click on `SUBMIT`.
7. A small window will appear with the information that the room was created.

### Delete a room
1. Login as user with ADMIN role.
2. Open `Admin` -> `Room/Desk Management` in the left sidebar.
3. Click on `Delete Room`.
4. Choose a building and a floor. Select the icon of the room you like to delete and click on it.
5. If a desk is in the room you will be asked if it is ok that the desk(s) are also deleted. 
6. Click on `YES`.
7. A small window will appear with the information that the room was deleted.

### Update a room
1. Login as user with ADMIN role.
2. Open `Admin` -> `Room/Desk Management` in the left sidebar.
3. Click on `Edit Room`.
4. Choose a building and a floor. Select the icon of the room you like to edit and click on it.
5. You can now change the room type, status and remark.
6. Click on `SUBMIT`.
7. A small window will appear with the information that the room was changed.

### Create a new desk
A desk/workstation is a concrete place that a user can book. For the following guide we assume that the room, in which the new desk will be placed, already exists.

1. Login as user with ADMIN role.
2. Open `Admin` -> `Room/Desk Management` in the left sidebar.
3. Click on `Add Workstation`.
4. Choose a building and a floor. Click on the image where the room is located in which you like to place the new desk.
5. After selecting a room, enter the workstation properties:
   - `Ergonomics`
   - `Monitors`
   - `Desk Type`
   - `Docking Station`
   - `Webcam`
   - `Headset`
   - required `Desk Remark`
   - optional `Special Features`
   - `Fixed`
6. Click on `SUBMIT`.
7. A small window will appear with the information that the desk was created.

Notes:
- `Desk Remark` is required.
- `Special Features` is optional and has a character limit.
- If `Fixed` is set to `Yes`, the workstation is treated as permanently assigned and is not available in normal user booking/search flows unless it is unhidden via `Admin` -> `Room/Desk Management`.

### Delete a desk
1. Login as user with ADMIN role.
2. Open `Admin` -> `Room/Desk Management` in the left sidebar.
3. Click on `Delete Workstation`.
4. Choose a building and a floor. Click on the image where the room is located in which the desk is located you like to delete.
5. In the lower half of the screen you will see the label `Choose a desk`. Click on the triangle next to it. A list of all desks in this room will be shown. Choose the desk you wish to delete and click on it.
6. Below you will see the attributes of the choosen desk. If you are sure, click on `DELETE`.
7. If at least one booking is associated with this desk, you will be asked if it is ok that the booking(s) are also deleted. 
8. A small window will appear with the information that the desk was deleted.

### Update a desk
1. Login as user with ADMIN role.
2. Open `Admin` -> `Room/Desk Management` in the left sidebar.
3. Click on `Edit Workstation`.
4. Choose a building and a floor. Click on the image where the room is located in which the desk is located you like to edit.
5. In the lower half of the screen you will see the label `Choose a desk`. Click on the triangle next to it. A list of all desks in this room will be shown. Choose the desk you wish to edit and click on it.
6. Below you will see the current desk properties. You can update:
   - `Ergonomics`
   - `Monitors`
   - `Desk Type`
   - `Docking Station`
   - `Webcam`
   - `Headset`
   - `Desk Remark`
   - `Special Features`
   - `Fixed`
7. Click on `UPDATE`.
8. A small window will appear with the information that the desk was updated.

Notes:
- `Desk Remark` remains required when editing.
- `Special Features` is optional and has a character limit.
- Setting `Fixed` to `Yes` removes the workstation from normal user booking/search flows, but admins can still manage it here.

### Hide/Show fixed workstations
Use this function to control whether fixed desks are visible in normal user booking and search flows.

1. Login as user with ADMIN role.
2. Open `Admin` -> `Room/Desk Management` in the left sidebar.
3. Click on `Hide/Show Fixed`.
4. Choose the floor you want to manage.
5. A list of fixed desks for that floor is shown.
6. Click `Hide` or `Show` on the target desk.

Notes:
- This action is intended for fixed desks.
- Hidden desks are excluded from normal desk booking/search lists.
- Showing a fixed desk makes it available again in standard user flows.

## Booking settings
Configure global booking rules that apply to every booking.

1. Login with ADMIN role.
2. Open `Admin` -> `Booking Settings` in the left sidebar.
3. Set:
   - **Lead time**: 0–12 hours in 0.5h steps (minimum time before a booking may start).
   - **Max duration**: Unrestricted or 2–12 hours (0.5h steps).
   - **Max advance**: Unrestricted or 7/14/30/60/90/180 days (how far into the future users can book).
4. Click **Submit**. **Reset to defaults** restores 30 min lead time, 6h max duration, 30 days max advance.

The backend enforces these rules for all users and booking flows and the UI blocks invalid choices and shows explanatory messages to users.

## Search options
### Search for free rooms
If a group wants to meet it is useful to quickly find a room with at least n desks in it. This search option helps the user with this task.

1. Login
2. On the left side you will see the row called `Search`. Click on it.
3. Three search options will be shown.
4. Click on `Room`.
5. You see the Roomsearch page.
6. Enter the minimal amount of desks you whish a room has in it.
7. A list of rooms with at least n desks will appear.
8. You can tighten the search by providing a specific date and a start and end time. This will only show rooms with at least n desks that are not booked on the specified day in the specified time range.

### Search for free desks
If a user wants to quickly occupy a free desk, this search option will help to find free desks.

1. Login
2. On the left side you will see the row called `Search`. Click on it.
3. Three search options will be shown.
4. Click on `Workstations`.
5. You see the Free Workstations page.
6. You can optionally choose a day, a start time, an end time and a building. If no day/time is selected, the page still shows desks that match the current building and workstation filters.
7. (Optional) Use the advanced workstation filters to narrow the list, for example by ergonomics, monitor count, desk type, technology, or special features. Saved presets can also be created/applied here.
8. If day, start time and end time are all filled, the list switches to desks that are free in the selected time range.
9. Click `SUBMIT` in the row of your choice.

### Search for colleagues
Often you want to sit next to your colleagues. To do so you must know the rooms where your colleagues booked desks at a given time. This search option helps you to find your colleagues.
1. Login
2. On the left side you will see the row called `Search`. Click on it.
3. Three search options will be shown.
4. Click on `Colleagues`.
5. You see the Colleagues page. 
6. Paste a comma separated list of colleague identifiers and enter a date. Supported identifiers are:
   - email addresses
   - full names
   - abbreviations
7. Click `SEARCH`.
8. In the lower part of the page a list of all colleagues will appear with all their bookings on the given date.

Notes:
- Admin users can also see colleagues configured with `Anonymous` visibility.
- Non-admin users cannot see anonymous colleagues.

### Search of Service contacts
If you need to find contact details of admins or service personel (ie. phone numbers or emails), you complete these steps.
1. Login
2. On the left side menu you will see the row called `Search`. Click on it.
3. Click on 'Service Contacts'
4. View or copy-and-paste contact details of the admins or service personel
5. OR Use the mssaging form (placeholder in Sprint 2)

## Settings

### Change language
1. Login
2. On the left side you will see the row called `Settings`. Click on it.
3. A list of settings options will be shown.
4. Click on `Deutsch` if you want to change the language from english to german or `English` otherwise.

### Defaults
A user can change the default floor, which is displayed first when a booking is initiated. Also the default viewmode (day, week, month) of the calendar can be changed. 

1. Login
2. On the left side you will see the row called `Settings`. Click on it.
3. A list of settings options will be shown.
4. Click on `Defaults`.
5. Change the default viewmode for the calendar in My Bookings. Select between day, week or month.
6. Choose your default floor. This floor is displayed first when you want to book a desk. To do so choose the building and the concrete floor.
7. Click in `SUBMIT`.
8. A small window will appear with the information that the settings was successful updated.

### Visibility
Choose how your name is shown to other users (admins still see full names).

1. Login
2. Click `Settings` -> `Visibility`.
3. Pick one option: `Name`, `Abbreviation`, or `Anonymous`.
4. Click `SUBMIT`. Your preference is saved per user and persists through logout/login.

### Notifications
Choose which events should send you an Outlook email (with calendar invite) via Mail.

1. Login
2. On the left side click `Settings` → `Notifications`.
3. In the modal, toggle the events you want:
   - Booking created
   - Booking cancelled
   - Parking request decision (approve/reject of your request)
4. Click `SUBMIT` to save and close. `CANCEL` closes without changes.

### Password
Follow the next steps to change your password.

1. Login
2. On the left side you will see the row called `Settings`. Click on it.
3. A list of settings options will be shown.
4. Click on `Password`.
5. Enter your current password.
6. Enter the new password. Confirm the new password by enter it again.
7. Click `SUBMIT`.
8. A small window will appear with the information that the password was changed successfully.

### MFA Settings (admins only)
Admins can optionally enable Multi-Factor Authentication (MFA) using a TOTP authenticator app (e.g., Google Authenticator).

1. Login as a user with ADMIN role.
2. Click `Settings` -> `MFA Settings`.
3. Click `Enable MFA`.
4. Scan the displayed QR code with your authenticator app.
5. Enter the 6-digit code from the app to confirm setup.
6. To disable MFA later, click `Disable MFA` and confirm using either your password or a current 6-digit code.

### Service Contacts
All users can the the service contacts of the main admin and service personel.

1. Login.
2. Look at the bottom of the side bar navigation component.
3. View or copy the email/phone lines of the service contacts.

## Favourites
Save rooms and parking spots you use often and jump back to them quickly.

How to add favourites:
- In the room booking view, click the star in the top-right of the room screen.
- Select the room in Roomsearch and click the empty star (Favourites come up first).
- In the parking details view, click the star in the details header.
- Empty star = not a favourite, filled star = favourite.

From the sidebar, click `Favourites` to:
1. See your saved room favourites and parking favourites.
2. Optionally choose one shared `Date`, `Start Time`, and `End Time` filter for both sections.
3. If all three fields are filled with a valid time range, favourites are checked for availability in that period:
   - available entries are shown in green
   - unavailable entries are shown in red
4. Click `Book` on a room or parking favourite to open the corresponding booking screen.
5. Click the star to remove the favourite.

## Home overview
The `Home` page is the main entry point for both desk and parking workflows.

### View and mode toggles
- `Calendar/Floor` toggle: Switch between month calendar view and floor-based view.
- `Desk/Parking` toggle: Switch between desk mode and parking mode.

### Floor toolbar
- In floor view, the toolbar provides `Today`, `Back`, and `Next` for day navigation.

### Filters on Home
In calendar mode, the filter area can be used to narrow the daily booking list.

Desk mode filters:
- `Building` (single active building selector)
- `Rooms` (dependent on selected building)
- `Ergonomics`
- `Monitors`
- `Desk Type` (adjustable / not adjustable)
- `Technology` (docking station, webcam, headset)
- `Special Features` (yes/no)

Parking mode filters:
- `Parking types`
- `Covered`

Notes:
- Filter combinations are normalized automatically.
- The UI enforces a maximum number of selected filters.

### Daily list (bottom panel) and color rules
- The lower list shows bookings for the selected day in the active mode.
- Colors indicate ownership and status:
- Own bookings: blue.
- Own parking bookings with `PENDING`: yellow.
- Other users' parking bookings with `PENDING`: light gray.
- Other users' bookings and accepted/occupied entries: dark gray.

## Create a booking
The main task of this tool is to let the user create bookings in defined time ranges on specific desks.
For this we assume that an admin already include at least a building with a floor that contains a room with an desk.

1. Login
2. You see the main page with the Home view. This is indicate by the word home that is highlighted in the left bar and also in the url that contains /home.
3. Use the view toggle to switch between `Calendar` and `Floor`.
4. Choose the date on which you want to book a desk.
5. Open the floor selection view for that date. Here you can choose a building and a floor in this building. The image in the center is the floor plan of the selected floor. Every blue icon indicates a room. A room can have 0..n desks in it.
6. Select a room by left-clicking one of the blue icons.
7. You see the desk view for the chosen room. If the room has desks in it, you will see them on the left side.
8. Choose a desk by left-clicking one of the desks on the left. The chosen desk changes color and a temporary booking lock is acquired.
9. Select a time range in the timeline by click-dragging to the desired end time. If your selected range collides with another booking, a warning appears.
10. After you choose a valid time range it appears grey.
11. Click `BOOK` on the bottom of the view.
12. A confirmation dialog appears with booking details. Click `Confirm` to finalize or `Cancel` to abort.
13. If confirmed, a message appears confirming the booking was successful.

Notes:
- Desk locking uses a 3-minute lock window. If the lock expires, you must reselect the desk.
- If another user currently holds the lock for that desk/day, booking is blocked and a warning is shown.
- If your selected slot overlaps, the UI can show alternative desk suggestions.

### Admin room booking
Admins can book multiple desks in one room at once by using the room booking mode.
This is not a separate page. It is an admin-only mode inside the normal room booking screen (`/desks`).

You can reach the room booking screen from multiple places:
1. Login as user with `ADMIN` role.
2. Use one of these entry points:
   - `Home`: choose a date, open a building/floor, and select a room.
   - `Search` -> `Room`: open a room from the room search results.
   - `Favourites`: open a saved room from the favourites list.
   - Any other workflow that opens the room booking screen for a room.
3. In the room page, use the `Desk` / `Room` toggle at the top.
4. Switch to `Room`.

Room booking flow:
1. In room mode, select a time range in the calendar.
2. The calendar supports `Day` and `Week` view.
3. The selectable time range is `06:00` to `22:00`.
4. The selection must stay on one day and use valid start/end times.
5. After selecting a valid period, the system automatically loads a preview for that room.

Preview panels:
- `Included`: desks that will be booked.
- `Conflicts`: desks that are currently unavailable for the selected time.
- `Excluded`: desks that are not eligible for room booking.

Possible desk statuses in the preview:
- `Bookable`
- `Hidden`
- `Blocked`
- `Locked by other user`
- `Booking conflict`
- `Scheduled blocking`

Create the room booking:
1. Review the counts for included, conflicted, and excluded desks.
2. Click `Book desks`.
3. Confirm the dialog.
4. The system creates one standard desk booking per eligible desk in that room.

Notes:
- Room booking is admin-only.
- The room screen still opens in `Desk` mode first. Admins must switch to `Room` mode manually.
- The created desk bookings belong to the admin account that performed the action.
- At least one desk must be in the `Included` group before submission is possible.
- Desks that are `Hidden` or `Blocked` are excluded automatically.
- Desks with an overlapping booking, an active booking lock held by another user, or an overlapping scheduled maintenance block are not booked.
- Only the currently eligible desks are created. Conflicted desks are skipped.
- The same booking rules apply as for desk bookings: future start time, 30-minute alignment, booking lead time, maximum duration, and maximum advance window from `Booking Settings`.
- If the room screen was opened from `Search` -> `Room` with a complete date and time range, that period is prefilled in the room booking calendar.
- If the room screen was opened from `Favourites` with a complete and available date/time selection, that period is prefilled in the room booking calendar. If no active timeframe is applied, or the room is not available for that selected timeframe, the room still opens but without a prefilled period.
- If a desk becomes unavailable between preview and confirmation, the room booking can fail and must be retried.
- Successful room bookings are grouped with one shared `Bulk Group ID`. This is the identifier assigned to all desk bookings created by the same room booking action.
- If booking-create notifications are enabled for the admin account, the admin receives a room bulk booking confirmation email.

## Create a parking spot booking
This tool allows any logged-in user to reserve and book a parking spot.

1. Login
2. Navigate to the carpark map in 2 possible ways:
   - Open `Home` from the sidebar (`/home`).
   - Use the mode toggle to switch from `Desk` to `Parking`.
   - (Optional) Use the view toggle to switch between `Calendar` and `Floor` view.
  OR
   - Open `Search` from the sidebar.
   - Select the `Parking` tab.
3. Select the date and time range in the parking toolbar and time panel.
4. (Optional) Use the filter bar to view only specific parking space types (standard / accessible / e-charging / station / motorcycle, and covered / uncovered).
7. Click an available (green) parking spot on the map to open the details modal.
8. Provide a justification (20-500 characters) for your parking reservation request, and click `Reserve`.
9. For non-admin users, the reservation is created as `PENDING` (yellow) until an admin approves or rejects it.
10. If approved, the spot becomes occupied (red). If rejected, it is not booked for you and becomes blocked for the selected time frame.
11. For occupied/pending spots you can open details to see reservation information (time window, requester, spot properties). A 30-minute overlap buffer is applied.

## My Bookings
`My Bookings` gives you an overview of your own desk reservations and actions for each entry.

1. Login.
2. Open `My Bookings` from the sidebar.
3. The calendar shows your bookings and includes historical entries with a lookback window of 90 days.
4. Click one booking to open the booking details modal (day, time, building, room, desk, equipment).
5. For current/future bookings:
   - Use `Cancel Booking` to remove the booking.
   - Use `Edit Booking` to open the desk booking screen in edit mode and update date/time/desk.
   - Use `Export ICS` to download the selected booking as a `.ics` calendar file.
6. For past bookings:
   - The details modal and `Export ICS` remain available.
   - Edit and cancel actions are not available.

## Create and manage series bookings
A series allows users to create bookings at fixed intervals on a chosen desk between a start date and an end date.

To let users choose the concrete days on which bookings are created, the parameter `Frequency` is introduced:
- `Daily`: For every day in [start date .. end date], a booking is created.
- `Weekly`: Every seventh day in [start date .. end date], a booking is created. Additionally, a weekday must be provided. The first booking happens on the first weekday in the interval [start date .. end date].
- `Every two weeks`: Every two weeks in [start date .. end date], a booking is created. Additionally, a weekday must be provided. The first booking happens on the first weekday in the interval [start date .. end date].
- `Every three weeks`: Every three weeks in [start date .. end date], a booking is created. Additionally, a weekday must be provided. The first booking happens on the first weekday in the interval [start date .. end date].
- `Monthly`: Every month in [start date .. end date], a booking is created. Additionally, a weekday must be provided. The first booking happens on the first weekday in the interval [start date .. end date].

Process: 

1. Login.
2. You see the main page with the `Home` view (`/home`).
3. On the left side you will see the row called `Series Bookings`. Click it and choose `Create`.
4. You are directed to the series booking page. Here you can optionally define:
   - `Start Date`
   - `End Date`
   - `Start Time`
   - `End Time`
   - `Frequency`
   - `Day of the Week` (depending on frequency)
   - `Building`
5. Even before a complete date/time range is selected, a list of desks is shown for the current building selection.
6. As soon as start date, end date, start time, and end time are all filled with a valid range, the system calculates the recurring booking dates.
7. (Optional) Use the advanced workstation filters to narrow the list, for example by ergonomics, monitor count, desk type, technology, or special features. Saved presets can also be created/applied here.
8. The calculated dates are shown in the center of the page under `Day of the Week`.
9. In the lower part of the page, you can see desks that are available for the provided parameters. If a desk already has a conflicting booking on one of the calculated dates for the selected time range, it is not shown.
10. To create the series, click `SUBMIT` on your chosen desk.
11. If no complete date/time range is selected yet, the system shows a message asking you to select date and time first.
12. If the date/time range is complete and valid, a small window appears with the information that the series was created.
13. To see your series bookings, click `Series Bookings` and then `Manage`.
14. You see a table of all your series bookings.
15. If you want to delete a series (and all bookings that belong to it), click `Delete`. You will be asked to confirm.
16. A small window appears with the information that the series was deleted.

## Defect management system

### Roles and access
- Every logged-in user can report defects from booking-related pages.
- Users with `SERVICE_PERSONNEL` or `ADMIN` role can open and use the Defect Dashboard.
- Admin users inherit service personnel permissions.

### Report a defect
Defects can be reported from:
- `Home` (calendar/room desk booking view) via the `Report Defect` button for the selected workstation.
- `Search` -> `Workstations` via the `Report Defect` button in the free-desk result table.
- `Series Bookings` -> `Create` via the `Report Defect` button in the desk result table.

Reporting flow:
1. Click `Report Defect`.
2. Select a `Category`:
   - `Technical Defect`
   - `Missing Equipment`
   - `Incorrect Description`
3. Select an `Urgency`:
   - `Low`, `Medium`, `High`, or `Critical`
4. Enter a `Description` (minimum 20 characters).
5. Submit the form.

Notes:
- Only one active defect is allowed per workstation. If an unresolved defect already exists, reporting is rejected.
- On successful creation, a ticket number is generated in format `DEF-000001`.
- New defects start with status `NEW`.

### Defect dashboard (service personnel and admins)
1. Open `Defects` from the left sidebar.
2. Select the section:
   - `All Defects`: all tickets.
   - `My Assignments`: defects assigned to the current user.
   - `Defect History`: all defects for one selected workstation.
3. Select the visual mode:
   - `List`
   - `Kanban`

Filtering:
- In `All Defects` and `My Assignments`, filter by urgency, category, status, room, and age range in days.
- In `Defect History`, first select a workstation, then all defects for that workstation are shown.

### Work with a defect ticket
Open a ticket from list or kanban to see details:
- Ticket ID
- Location (building/floor/room/workstation)
- Status, urgency, category
- Reporter
- Reported timestamp
- Description
- Assigned service person

Status changes:
- `NEW` -> `IN_PROGRESS`
- `IN_PROGRESS` -> `RESOLVED`

When a ticket is set to `RESOLVED`, the workstation is automatically unblocked if it was blocked by that ticket.
Any remaining scheduled maintenance blockings for that defect are also cancelled.

For unresolved defects, the ticket drawer also provides a `Maintenance Calendar` button for planning future workstation blocking windows.

### Block and unblock workstations from a defect
1. Open a defect ticket.
2. Enter `Estimated End Date`.
3. Click `Block Workstation`.

If future bookings exist for that workstation, the system asks whether to:
- `Cancel Bookings` (future bookings are removed and cancellation notifications are sent), or
- `Retain Bookings` (future bookings remain as-is).

While blocked, the workstation shows:
- Blocked reason (defect category)
- Estimated end date

You can:
- Update the end date.
- Unblock using `Unblock Workstation`.

### Maintenance Calendar
The Maintenance Calendar is tied to one unresolved defect and its workstation. It is available to users with `SERVICE_PERSONNEL` or `ADMIN` role.

Open it like this:
1. Open `Defects` from the left sidebar.
2. Open an unresolved defect ticket.
3. Click `Maintenance Calendar`.

Month view:
- The page header shows the workstation location.
- Each day displays `Blocking sum`, which counts maintenance blocking entries for that day, including `SCHEDULED`, `ACTIVE`, and `COMPLETED`.
- Use `Today`, `Back`, and `Next` to move through months.
- Click a day or `Schedule Blocking` to open the day view for that date.

Day view:
- The calendar shows the selected day for the workstation.
- Existing scheduled maintenance entries are shown in gray.
- New selections are shown separately until they are submitted.
- The selectable time range is `06:00` to `22:00`.

Create a scheduled blocking:
1. In day view, click-drag over the desired time range.
2. The selected period must be in the future.
3. The selected period must be at least `1 hour`.
4. The selected period cannot overlap another scheduled maintenance entry for the same workstation.
5. Click `Schedule Blocking`.

If bookings already exist in the selected time range, a decision dialog appears:
- `Retain Bookings`: the scheduled blocking is created, but existing future bookings stay in place until the blocking starts.
- `Cancel Bookings`: overlapping future bookings are deleted immediately and booking cancellation notifications are sent.

Scheduled blocking lifecycle:
- New entries start with status `SCHEDULED`.
- When the start time is reached, the workstation is automatically blocked and the entry becomes `ACTIVE`.
- If overlapping bookings still exist at activation time, they are cancelled automatically.
- When the end time is reached, the entry becomes `COMPLETED` and the workstation is unblocked automatically.
- If a defect is resolved, all remaining `SCHEDULED` and `ACTIVE` entries for that defect are cancelled.

Cancel a scheduled blocking:
1. Open the day view for the date that contains the entry.
2. Click the existing blocking in the calendar.
3. Click `Cancel`.
4. Confirm the prompt.

Notes:
- Only entries with status `SCHEDULED` can be cancelled manually.
- `ACTIVE` and `COMPLETED` entries remain visible in the calendar history but cannot be cancelled.
- A resolved defect cannot receive new scheduled blockings.

### Internal notes on defects
Service personnel/admin users can add internal notes to a ticket.

Rules:
- Note content cannot be empty.
- Only the original note author can edit or delete their note.
- Edited notes display an updated timestamp.

### Notifications and automatic assignment
When a defect is created:
- The reporter receives a confirmation email.
- The system tries to auto-assign the ticket to a random active service personnel user (non-admin account).
- If assigned, the assignee receives an assignment email.
- If no active service personnel user is available, the defect remains unassigned.

When defect status changes:
- The reporter receives a status update email.

Notification details:
- Language follows each recipient's preferred language (`English`/`Deutsch`).
- Assignment emails can include a direct `/defects` dashboard link when `FRONTEND_BASE_URL` is configured.
- Emails are sent only when `ICS_NOTIFICATIONS_ENABLED=true` and mail settings are configured.

### Blocked workstation behavior in booking flows
- Desks blocked by a defect or by an active maintenance blocking are visibly marked as blocked in booking views.
- Users cannot book blocked desks from the UI.
- Users also cannot create or edit bookings that overlap a scheduled maintenance blocking window.
- Backend validation rejects booking creation/confirmation for blocked desks and for time ranges that overlap scheduled maintenance blockings.
- Availability-based desk results, including series booking candidates, exclude desks with overlapping scheduled maintenance blockings.

## Booking Management dashboard
The Booking Management dashboard is available to users with `ADMIN` role.

Open it like this:
1. Login as user with `ADMIN` role.
2. Open `Admin` -> `Booking Management` in the left sidebar.

The dashboard has three views:
- `Desk bookings`: confirmed desk bookings.
- `Parking bookings`: approved parking reservations.
- `Parking Requests`: pending parking requests waiting for review.

The `Parking Requests` toggle shows the current number of pending requests when there are open items.

### Desk bookings view
This view lists existing desk bookings with:
- Date
- Start time
- End time
- Email
- User name
- Role
- Department
- Building
- Room
- Desk
- Series ID

Available filters:
- Date
- Start time
- End time
- Email
- Name
- Role
- Department
- Building
- Room
- Desk
- Series ID

Notes:
- Building, room, and desk filters are dependent selectors. After choosing a building, only matching rooms are shown. After choosing a room, only matching desks are shown.
- `Clear filters` resets the current filter set.
- The dashboard shows the current result count above the table.

Admin actions for desk bookings:
- `Edit Booking`: change date, time, and workstation assignment.
- `Cancel`: remove the booking.

Desk booking edit flow:
1. Click `Edit Booking` in the target row.
2. Review the current assignment.
3. Change the date and/or time.
4. Select a target building, room, and desk from the currently available candidates.
5. Enter a mandatory justification.
6. Click `Save Changes`.

Desk edit rules:
- The time range must be valid.
- The updated booking must still comply with the configured booking settings.
- Only currently available desks are offered as candidates.
- Hidden desks are excluded.
- Blocked desks are excluded.
- Desks with overlapping scheduled maintenance blockings are excluded.
- Desks with overlapping bookings are excluded.
- If no valid change is made, the update is rejected.
- Bookings whose start time has already passed cannot be edited.

Desk booking cancellation:
1. Click `Cancel`.
2. Enter a mandatory cancellation justification.
3. Confirm the cancellation.

Desk cancellation rules:
- Bookings whose start time has already passed cannot be cancelled.
- Admin cancellation sends a cancellation notification with the provided justification.

### Parking bookings view
This view lists approved parking reservations with:
- Date
- Start time
- End time
- Email
- User name
- Role
- Department
- Spot number
- Justification (`View Justification`)

Available filters:
- Date
- Start time
- End time
- Email
- Name
- Role
- Department
- Spot number

Admin actions for parking bookings:
- `Edit Booking`: change date, time, and parking spot.
- `Cancel`: remove the approved reservation.
- `View Justification`: open the requester justification in a dialog.

Parking booking edit flow:
1. Click `Edit Booking`.
2. Change the date and/or time.
3. Select one of the currently available parking spot candidates.
4. Enter a mandatory justification.
5. Click `Save Changes`.

Parking edit rules:
- Only approved reservations appear in this view.
- Only active, unblocked, non-special parking spots are offered as candidates.
- Candidate spots must be free in the selected time range.
- The time range must be in the future, must end after it starts, must use 30-minute steps, and must be at least 30 minutes long.

Parking booking cancellation:
1. Click `Cancel`.
2. Enter a mandatory cancellation justification.
3. Confirm the cancellation.

### Parking Requests view
This view is used to review pending parking requests.

Each row shows:
- Date
- Start time
- End time
- Email
- User name
- Role
- Department
- Spot number
- Justification (`View Justification`)

Available actions:
- `Approve`: approve one request.
- `Reject`: reject one request.
- `Bulk Approve`: approve all requests currently shown after filtering.

Available filters:
- Date
- Start time
- End time
- Email
- Name
- Role
- Department
- Spot number

Notes:
- `Bulk Approve` works on the filtered result set, not on hidden rows.
- After a bulk approval, the dashboard reports how many requests were approved and how many failed.
- If a request becomes unavailable because of an overlap or another conflict, approval can fail and the list refreshes.
- Use `View Justification` to inspect the requester explanation before approving or rejecting.
     
## Add new floor images
Every room is associated with an floor in a building.
This tool helps to visualize the position of the rooms with a floor plan of every floor. Every room is associated with a x- and a y-coordinate. The user see the room on the floor plan according to the x- and y-coordinate.
That implies that for every floor an floor plan must be available. 

Now the images of the floor plan are stored as .png in `$PROJECT_PATH/frontend/public/Assets/BuildingName` where `BuildingName` must match to the name of the building stored in table buildings in the database.

This approach is prone to errors. A better solution for the future is to store the images as blobs directly in the database.

For now you have to follow the following steps to add a new building or new floors to existing buildings.

1. Add a new entry to the table building. (only if you want to create a new building)
2. Add a new entry to the table floor with floor_id as a foreign key to the needed building row. Set `name` and `name_of_img` correctly.
3. In `$PROJECT_PATH/frontend/public/Assets/` create a new folder with the name of the building. The folder may be named `$PROJECT_PATH/frontend/public/Assets/Mustergebäude`.
4. For every floor you must have a png file representing the floor plan. The effective file reference is `floors.name_of_img`, so the png filename must match `name_of_img`.
5. If you restart your application (`./scripts/build_and_run.sh`) and choose the building and the floor you can add new rooms with new desks (if you have admin rights). After this these desks can be booked.
