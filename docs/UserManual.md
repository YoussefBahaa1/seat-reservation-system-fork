# User Manual

## User management
### Add new user
After you executed initDatabase.sh you can login as test.admin@mail.de with the password test. With this account you can start to add your real users. It is important that, after you setup your real world users, you delete all test users with their unsafe passwords. See [DefaultTestUsers.md](DefaultTestUsers.md) for a complete list of test accounts.

A step by step guide how to add a new user is seen in the following list:

1. Login as user with ADMIN role.
2. On the left side you will see the row called `Admin`. Click on it to go to the Admin Panel.
3. Click on `User Management`.
4. Click on `Add User`.
5. Provide the user's `Email`, a default `Password`, `Name`, and `Surname`.
6. (Optional) Provide a `Department`.
7. Select the user's role(s):
   - If the user should be an admin, set `Admin` to `True`. (Admins inherit Employee and Service Personnel permissions via role hierarchy.)
   - If the user is not an admin, select at least one of: `Employee`, `Service Personnel`. (Both can be selected.)
8. Click `Submit`.
9. A small window will appear with the information that the user was created successfully.

Notes:
- Email addresses are validated. Only valid email formats are accepted.
- New users are active by default.

### Delete user
1. Login as user with ADMIN role.
2. On the left side you will see the row called `Admin`. Click on it to go to the Admin Panel.
3. Click on `User Management`.
4. Click on `Delete User`.
5. (Optional) For a faster search enable filter:
   - Turn on `Enable Filter`.
   - Choose a `Column` (e.g., Email), choose a `Condition` (`contains` or `is equal`), and enter text.
   - You can add multiple filters and choose whether to match `All` or `Any` filters.
6. Click `DELETE` for the selected user. You will be asked to confirm the deletion.
7. If the user has done at least one booking a window will appear. You will be asked to delete all bookings that belong to the user. Click `YES`.
8. A small window will appear with the information that the user was deleted.

Tip: Some columns are boolean and can be filtered with `True/False` (e.g., Activity and MFA).

### Deactivate / Reactivate user
Deactivating a user locks them out of the system without deleting their account (soft lockout). Their history and data are retained, and they can be reactivated later.

1. Login as user with ADMIN role.
2. On the left side you will see the row called `Admin`. Click on it to go to the Admin Panel.
3. Click on `User Management`.
4. Click on `Deactivate/Reactivate User`.
5. (Optional) Use the filter to find the target user (see the filtering notes in the Delete section).
6. Click `DEACTIVATE` to lock the account, or `REACTIVATE` to restore access.
7. A confirmation prompt appears before the action is applied.

Notes:
- Deactivated users appear with Activity = `deactivated` and are shown at the bottom of the user table.
- Deactivated users cannot log in until reactivated.

### Roles and changes for users
A basic role hierarchy is implemented:
- `ROLE_ADMIN` inherits permissions from `ROLE_EMPLOYEE` and `ROLE_SERVICE_PERSONNEL`.
- Non-admin users must have at least one of: Employee, Service Personnel (or both).

Admins can manage user properties via the admin panel (email, name, surname, department, roles) and can additionally perform administrative actions like password resets and account deactivation.

To edit a user's roles or profile:
1. Login as user with ADMIN role.
2. On the left side you will see the row called `Admin`. Click on it to go to the Admin Panel.
3. Click on `User Management`.
4. Click on `Edit User`.
5. (Optional) Enable filter and search for the user by Email (or other fields). You can add multiple filters and match `All`/`Any`.
6. Click on `EDIT` for the selected user.
7. Update the user's attributes (email, name, surname, department, and roles). Email format is validated.
8. (Optional) Click `Reset Password` and enter the new password twice to confirm the reset.
9. Click `Update`.
10. A small window will appear with the information that the user was changed.

MFA notes (admins only):
- Admins can enable/disable MFA for their own account under `Settings` -> `MFA Settings`.
- If an admin is locked out due to MFA, another admin can disable MFA for that user via the admin user table (recovery flow).

## Room and desk management
### Create a new room
A room contains desks/workstations. A room is located in a floor. For the following guide we assume that the floor (and therefore the building) are already added.

1. Login as user with ADMIN role.
2. On the left side you will see the row called `Admin`. Click on it to go to the Admin Panel.
3. Click on `Room/Desk Management`.
4. Click on `Add Room`.
5. Choose a building and a floor. Click on the image where the new room is located.
6. Select the roomy type, the status and a optional room remark. The remark will be shown when you hover over the room icon in the image.
7. Click on `SUBMIT`.
8. A small window will appear with the information that the room was created.

### Delete a room
1. Login as user with ADMIN role.
2. On the left side you will see the row called `Admin`. Click on it to go to the Admin Panel.
3. Click on `Room/Desk Management`.
4. Click on `Delete Room`.
5. Choose a building and a floor. Select the icon of the room you like to delete and click on it.
6. If a desk is in the room you will be asked if it is ok that the desk(s) are also deleted. 
7. Click on `YES`.
8. A small window will appear with the information that the room was deleted.

### Update a room
1. Login as user with ADMIN role.
2. On the left side you will see the row called `Admin`. Click on it to go to the Admin Panel.
3. Click on `Room/Desk Management`.
4. Click on `Edit Room`.
5. Choose a building and a floor. Select the icon of the room you like to edit and click on it.
6. You can now change the room type, status and remark.
7. Click on `SUBMIT`.
8. A small window will appear with the information that the room was changed.

### Create a new desk
A desk/workstation is a concrete place that a user can book. For the following guide we assume that the room, in which the new desk will be placed, already exists.

1. Login as user with ADMIN role.
2. On the left side you will see the row called `Admin`. Click on it to go to the Admin Panel.
3. Click on `Room/Desk Management`.
4. Click on `Add Workstation`.
5. Choose a building and a floor. Click on the image where the room is located in which you like to place the new desk.
6. You will be asked to choose the equipment for the desk and a optional desk remark.
7. Click on `SUBMIT`.
8. A small window will appear with the information that the desk was created.

### Delete a desk
1. Login as user with ADMIN role.
2. On the left side you will see the row called `Admin`. Click on it to go to the Admin Panel.
3. Click on `Room/Desk Management`.
4. Click on `Delete Workstation`.
5. Choose a building and a floor. Click on the image where the room is located in which the desk is located you like to delete.
6. In the lower half of the screen you will see the label `Choose a desk`. Click on the triangle next to it. A list of all desks in this room will be shown. Choose the desk you wish to delete and click on it.
7. Below you will see the attributes of the choosen desk. If you are sure, click on `DELETE`.
8. If at least one booking is associated with this desk, you will be asked if it is ok that the booking(s) are also deleted. 
9. A small window will appear with the information that the desk was deleted.

### Update a desk
1. Login as user with ADMIN role.
2. On the left side you will see the row called `Admin`. Click on it to go to the Admin Panel.
3. Click on `Room/Desk Management`.
4. Click on `Edit Workstation`.
5. Choose a building and a floor. Click on the image where the room is located in which the desk is located you like to edit.
6. In the lower half of the screen you will see the label `Choose a desk`. Click on the triangle next to it. A list of all desks in this room will be shown. Choose the desk you wish to edit and click on it.
7. Below you will see the attributes of the choosen desk. You can change them. If you are sure, click on `UPDATE`.
8. A small window will appear with the information that the desk was updated.

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
6. Enter a day, a start time and a end time. You can also choose a building or include all buildings in your search.
7. A list of free desks will appear.
8. Click on `SUBMIT` in the row of your choice.
9. You will be asked if you want to confirm your booking. Click `Yes`.
10. A small window will appear with the information that you successful booked the desk.

### Search for colleagues
Often you want to sit next to your colleagues. To do so you must know the rooms where your colleagues booked desks at a given time. This search option helps you to find your colleagues.
1. Login
2. On the left side you will see the row called `Search`. Click on it.
3. Three search options will be shown.
4. Click on `Colleagues`.
5. You see the Colleagues page. 
6. Paste a comma seperated list of the mails of the colleagues in question. Also enter a date. If ldap/AD is correctly configured you can also click on `Groups` to display all your AD groups. Select one and all email addresses of the group members will be paste as a comma seperated list in the textbox. 
7. Click `SEARCH`.
8. In the lower part of the page a list of all colleagues will appear with all their bookings on the given date.

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
5. Change the default viewmode for the calendar. Select between day, week or month.
6. Choose your default floor. This floor is displayed first when you want to book a desk. To do so choose the building and the concrete floor.
7. Click in `SUBMIT`.
8. A small window will appear with the information that the settings was successful updated.

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

### Visibility
Choose how your name is shown to other users (admins still see full names).

1. Login
2. Click `Settings` -> `Visibility`.
3. Pick one option: `Name`, `Abbreviation`, or `Anonymous`.
4. Click `SUBMIT`. Your preference is saved per user and persists through logout/login.

### Favourites
Save rooms you book often and jump back to them quickly.

On the room booking screen: click the star in the top-right. Empty = not a favourite; filled = favourite. Click to toggle.

From the sidebar: click `Favourites` (between Bookings and Search) to:
1. See your saved rooms (per-user, persistent).
2. Click BOOK to open that room’s booking view.
3. Click the star to remove.

Favourite Rooms also come up first in RoomSearch

## Create a booking
The main task of this tool is to let the user create bookings in defined time ranges on specific desks.
For this we assume that an admin already include at least a building with a floor that contains a room with an desk.

1. Login
2. You see the main page with the Calendar view. This is indicate by the word calendar that is highlighted in the left bar and also in the url that contains /home.
3. Choose a date on which you want to book a desk. Left click on it.
4. You see the floor selection view. Here you can choose a building and a floor in this building. The image in the center is the floor plan of the selected floor. Every blue icon indicates a room. A room can have 0..n desks in it.
5. Select a room. To do so left click on one of the blue icons. 
6. You see the desk view for the choosen room. If the room has desks in it, you will see them on the left side.
7. Choose a desk. To do so left click on one of the desks to the left. The choosen desk will change its color.
8. Select a time range. To do so right click in the table. Hold the left button and move the mouse to the wanted end time of your booking. Release the left mouse button. If youre desired time range collides with a booking of a other user a error message will appear.
9. After you choose a valid time range it will appear grey.
10. Click `BOOK` on the bottom of the view.
11. You will be asked if you like to commit this booking. Click either yes or no. If you clicked yes a message will appear, informing you the the booking was successfull.

## Create a parking spot booking
This tool allows any logged-in user to book a parking spot.

1. Login
2. Navigate thorough the sidebar to the Search tab.
3. Select Parking
4. Above the parking street plan you can select a valid date and time for your booking.
5. In the parking street plan you hover over any spot to view it's details and select (press on) any available spot (highlighted green).
6. After selecting an available spot you can press the Reserve button to book it for the selected time.
7. Your parking spot is now booked, now after un-selecting that spot or refreshing the page you'll see that spot is turned red.
8. For any spot highlighted red, you can hover over it to see who has booked it (does show yourself as well).

## Create and manage series bookings
A series allows the user to create bookings in fixed intervals on a choosen desk between an start date and end date.

To allow the user to adjust the concrete days on which bookings will be create, the parameter `Frequency` is introduced: 
- `Daily` For every day in [start date .. end date] a booking is created.
- `Weekly` Every seventh day in [start date .. end date] a booking is created. Additionally a weekday must be provided. The first booking happens on the first weekday in the interval [start date .. end date].
- `Every two weeks` Every two weeks in [start date .. end date] a booking is created. Additionally a weekday must be provided. The first booking happens on the first weekday in the interval [start date .. end date].
- `Every three weeks` Every three weeks in [start date .. end date] a booking is created. Additionally a weekday must be provided. The first booking happens on the first weekday in the interval [start date .. end date].
- `Monthly` Every month in [start date .. end date] a booking is created. Additionally a weekday must be provided. The first booking happens on the first weekday in the interval [start date .. end date].

We assume that an admin already include at least a building with a floor that contains a room with an desk.

1. Login
2. You see the main page with the Calendar view. This is indicate by the word calendar that is highlighted in the left bar and also in the url that contains /home.
3. On the left side you will see the row called `Series Booking`. Click on it and you will see two children elements: `Manage` and `Create`. For now we want to create a series booking and therefore we click on `Create`.
4. We are directed to a new page where we can define an start and end date. Between these dates the the series booking will take place. You have to provide an start and end time of the individual bookings. The frequency is used to set on which days between start date and end date we like to create bookings. You can choose a building or consider all buildings where a free desk is searched for your series booking. Finally a weekday on which you like to create bookings is needed if you dont choose `Daily` as `Frequency`.
5. In the central part of the page you see the calculated dates.
6. In the lower part of the page you can see all desks that are available for the provided parameters. If a desk has already a booking on the calculated dates for the provided timerange it is not displayed. 
To create a series, and therefore the bookings on the calculated dates, click `SUBMIT` on your choosen desk. 
7. A small window will appear with the information that the series was created.
8. To see your series bookings click left on `Series Booking` and then `Manage`.
9. You see a table of all your series bookings. 
10. If you want to delete a series, and therefore all bookings that belongs to this series, click on `Delete`. You will be asked if you really want to delete this series. 
11. A small window will appear with the information that the series was deleted.

## Add new floor images
Every room is associated with an floor in a building.
This tool helps to visualize the position of the rooms with a floor plan of every floor. Every room is associated with a x- and a y-coordinate. The user see the room on the floor plan according to the x- and y-coordinate.
That implies that for every floor an floor plan must be available. 

Now the images of the floor plan are stored as .png in `$PROJECT_PATH/frontend/public/Assets/BuildingName` where `BuildingName` must match to the name of the building stored in table buildings in the database.

This approach is prone to errors. A better solution for the future is to store the images as blobs directly in the database.

For now you have to follow the following steps to add a new building or new floors to existing buildings.

1. Add a new entry to the table building. (only if you want to create a new building)
2. Add a new entry to the table floor with floor_id as a foreign key to the needed building row. Note the name of the new floor.
3. In `$PROJECT_PATH/frontend/public/assets/` create a new folder with the name of the building. The folder may be named `$PROJECT_PATH/frontend/public/assets/Mustergebäude`.
4. For every floor you must have a png file representing the floor plan. The png file must have exact the same name as the freshly added floor in the floors table.
5. If you restart your application (`./scripts/build_and_run.sh`) and choose the building and the floor you can add new rooms with new desks (if you have admin rights). After this these desks can be booked.
