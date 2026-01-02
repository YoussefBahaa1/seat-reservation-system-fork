# User Manual

## Add new user
After you executed initDatabase.sh you can login as test.admin@mail.de with the password test. With this account you can start to add your real users. It is important that, after you setup youre real world users, you delete this user with this unsafe password.

A step by step guide how to add a new user is seen in the following list:

1. Login as user with ADMIN role.
2. On the On the left side you will see the row called `Admin`. Click on it to go to the Admin Panel.
3. Click on `User Management`.
4. Click on `Add Employee`. 
5. Provide the email, a default password, the name and the surname of the new user.
If the user shall be grandted admin rights select true. False otherwise.
9. Click `Submit`.
10. A small window will appear with the information that the user was creaded successfully.

## Roles
A basic role hierarchy is implemented. A user has per default the role USER. If this user needs to do some special tasks like adding other users or add/delete rooms he must be granted the role ADMIN. This is only can be done via gui if the executing user is a admin by himself. To do so:
1. Login as user with ADMIN role.
2. On the left side you will see the row called `Admin`. Click on it to go to the Admin Panel.
3. Click on `User Management`.
4. You can either add, delete or edit an employee. Given that you want to grant a normal user admin rights we click on Edit Employee. 
5. For a faster search enable filter. As column you choose Email. As the condition you choose =. Then paste the email of the user you want to change in the last text box.
6. A row with informations about the user will appear. Click on `EDIT`.
7. A window appears where you can change attributes of the user. (Note that for now the password cant be changed. Must be done in the future!)
8. Set Admin to True.
9. Click `Update`.
10. A small window will appear with the information that the user was changed.

A admin can do everything a normal user can do, plus all the administrative tasks. 

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
9. After you choose a valid time range the selected time range will appear grey.
10. Click `BOOK` on the bottom of the view.
11. You will be asked if you like to commit this booking. Click either yes or no. If you clicked yes a message will appear, informing you the the booking was successfull.

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
8. To see your series bookings click left on Series Bookings and then `Manage`.
9. You see a table of all your series bookings. 
10. If you want to delete a series, and therefore all bookings that belongs to this series, click on `Delete`. You will be asked if you really want to delete this series. 
11. A small window will appear with the information that the series was deleted.

## Add new floor images
Every room is associated with an floor in an building.
This tool helps to visualize the position of the rooms with a floor plan of every floor. Every room is associated with a x- and a y-coordinate. The user see the room on the floor plan according to the x- and y-coordinate.
That implies that for every floor an floor plan must be present. 

Now the images of the floor plan are stored as .png in `$PROJECT_PATH/frontend/public/Assets/BuildingName` where `BuildingName` must match to the name of the building stored in table buildings in the database.

This approach is prone to errors. A better solution for the future is to store the images as blobs directly in the database.

For now you have to follow the following steps to add a new building or new floors to existing buildings.

1. Add a new entry to the table building. (only if you want to create a new building)
2. Add a new entry to the table floor with floor_id as a foreign key to the needed building row. Note the name of the new floor.
3. In `$PROJECT_PATH/frontend/public/assets/` create a new folder with the name of the building. The folder may be named `$PROJECT_PATH/frontend/public/assets/Mustergebäude`.
4. For every floor you must have a png file representing the floor plan. The png file must have exact the same name as the freshly added floor in the floors table.
5. If you restart your application (`./scripts/build_and_run.sh`) and choose the building and the floor you can add new rooms with new desks (if you have admin rights). After this these desks can be booked.
