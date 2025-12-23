import { useEffect, useRef, useState } from 'react';
import {Table, Tooltip, Button, TableBody, TableCell, TableContainer,Typography, TableHead, TableRow, Paper, FormControl,Select, MenuItem, InputLabel, TextField } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { getRequest, postRequest } from '../RequestFunctions/RequestFunctions';
import CreateDatePicker from '../misc/CreateDatePicker';
import { toast } from 'react-toastify';
import { formatDate_yyyymmdd_to_ddmmyyyy } from '../misc/formatDate';
import isEmail from '../misc/isEmail';
import LayoutPage from '../Templates/LayoutPage';

const Colleagues = () => {
    const headers = useRef(JSON.parse(sessionStorage.getItem('headers')));
    const { t, i18n } = useTranslation();
    const [date, setDate] = useState(new Date());
    // Default endTime is 2 hours ahead.
    const [groups, setGroups] = useState([]);
    const [selectedGroup, setSelectedGroup] = useState('');
    const [memberObjects, setMemberObjects] = useState([]); 
    const [emailsString, setEmailsString] = useState('');

    function search() {
      const emailStrings = emailsString.split(',').map(emailString => emailString.trim());
      for (const emailString of emailStrings) {
        if (isEmail(emailString)) 
          continue;
        toast.error(i18n.language === 'de' ? `${emailString} ist keine gültige Lit-Emailadresse.` : `${emailString} is not a valid lit email address.`);
        return;
      }
      
      postRequest(
        `${process.env.REACT_APP_BACKEND_URL}/bookings/getBookingsFromColleaguesOnDate/${new Date(date).toISOString().split('T')[0]}`,
        headers.current,
        setMemberObjects,
        () => {console.log('Failed to fetch bookings in Colleagues.jsx.')},
        JSON.stringify(emailStrings)
      );
    }

    /*useEffect(()=>{
      console.log('g');
      if (groups.length === 0) {
        getGroups();
      }
    }, [groups]);*/
    useEffect(()=>{
      getGroups();
    }, []);

    function getGroups() {
        const email = localStorage.getItem('email');
        getRequest(
            `${process.env.REACT_APP_BACKEND_URL}/ldap/getGroupsByEmail/${email}`,
            headers.current,
            setGroups,
            () => {console.log('Error fetching rooms in Colleagues.jsx');}
          );
    } 

    function getMembers(groupCn) {
        getRequest(
            `${process.env.REACT_APP_BACKEND_URL}/ldap/getEmailsByGroup/${groupCn}`,
            headers.current,
            member_emails=>{
              setEmailsString(member_emails.join(','));
            },
            () => {console.log('Error fetching rooms in Colleagues.jsx');}
        );
    }

    function create_helpText() {
      return i18n.language === 'de' ? '<h1>Buchungen von Kollegen</h1><ul><li>Geben Sie zunächst die Emailadressen der Kollegen, jeweils durch ein Komma getrennt, ein. Alternativ können Sie auch eine Gruppe auswählen und so die Emailadressen vorbelegen lassen.</li><li>Anschließend muss ein Datum ausgewählt werden.</li> <li>Starten Sie die Suche um die Buchungen der ausgewählten Kollegen zum bestimmten Datum einzusehen.</li></ul>' : 
                                                          '<h1>Bookings if colleagues</h1><ul><li>Type in the email addresses of the colleagues, each seperated by a comma. Alternatively you can select a group to autofill the email addresses of the group members.</li><li>Additionally choose a date.</li> <li>Start the search to see which user has bookings on the selected date.</li></ul>';
    }
    
    return (
      <LayoutPage
        title={i18n.language === 'de' ? 'Kollegen' : 'Colleaguas'}
        helpText={create_helpText()}
        withPaddingX={true}
      >
        <Tooltip title={i18n.language === 'de' ? 'Die Email-Adresse des Kollegen. Bei mehreren durch Kommata getrennt.' : 'The email address. In case of more than one, comma seperated.'}>
          <TextField
            id='emailsString'
            variant='outlined'
            fullWidth
            placeholder={i18n.language === 'de' ? 'Kommaseparierte E-Mail-Adressen' : 'Comma seperated email addresses'}
            value={emailsString}
            onChange={e => {
                setEmailsString(e.target.value);
                setMemberObjects([]);
              }
            }
          />
        </Tooltip>
        <br/>
        <br/>
        <Tooltip title={i18n.language === 'de' ? 'Datum der eventuellen Buchungen.' : 'Date of bookings.'}>
          <span>
          <CreateDatePicker     
            disabledFunc={()=>{return false}}
            date={date}
            setter={date => {
                setDate(date);
                setMemberObjects([]);
              }
            }
            label={t('date')}
          />
          </span>
        </Tooltip>
        <br/>
        <br/>
        <Tooltip title={i18n.language === 'de' ? 'Gruppen in denen Sie Mitglied sind. Kann zur Vorauswahl der E-Mail-Adressen verwendet werden.' : 'Groups you are member of. Can be used to autofill email addresses.'}>
          <FormControl  id='groupSelectionForm' required={false} disabled={groups.length === 0} fullWidth>
            <InputLabel id='groupSelectionFormlabel'>
              {i18n.language === 'de' ? 'Gruppen' : 'Groups'}
            </InputLabel>
            <Select
              labelId='groupSelectionFormlabel'
              id='groupSelection'
              value={selectedGroup}
              onChange={(e) => {
                setSelectedGroup(e.target.value);
                getMembers(e.target.value);
              }}
              label={i18n.language === 'de' ? 'Grupen' : 'Groups'} // This line fixes the label border issue
            >
              {groups.map(group => (
                <MenuItem value={group} key={group}>
                  {group.split('CN=')[1].split(',')[0]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Tooltip>
        <br/>
        <br/>
        <Button disabled={emailsString === ''} id='searchBookingsOfColleaguesBtn' onClick={search}>
          {t('search')}
        </Button>
        <br/>
        <br/>
        {Object.keys(memberObjects).length > 0 &&
          <TableContainer component={Paper} sx={{
              maxHeight: 400, // Set max height
              overflowY: 'auto', // Enable vertical scroll
          }}>
            <Typography variant='h6' component='div' sx={{ padding: 2 }}>
              {i18n.language === 'de' ? `Buchungen der ausgewählten Kollegen zum ${formatDate_yyyymmdd_to_ddmmyyyy(new Date(date).toISOString().split('T')[0])} ` : `Bookings of colleagues on ${formatDate_yyyymmdd_to_ddmmyyyy(new Date(date).toISOString().split('T')[0])}`}
            </Typography>
            <Table stickyHeader id='colleagues_table'>
              <TableHead>
                <TableRow key='colleagues_table_header' id='colleagues_table_header'>
                  <TableCell>Email</TableCell>
                  <TableCell>{t('bookings')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.keys(memberObjects).map(memberEmail => (
                  <TableRow key={memberEmail} id={memberEmail}>
                      <TableCell id={`${memberEmail}_mail`}>{memberEmail}</TableCell>
                      <TableCell id={`${memberEmail}_bookings`}>
                        <div style={{ width: '100%', overflowX: 'auto' }}>
                          <div style={{ whiteSpace: 'nowrap', minWidth: 'max-content' }}>
                            {memberObjects[memberEmail].map((booking, index) => (
                              <span
                                key={index}
                                style={{
                                  display: 'inline-block',
                                  marginRight: '0.5rem',
                                  padding: '0.4rem 0.6rem',
                                  border: '1px solid #ccc',
                                  borderRadius: '6px',
                                  backgroundColor: '#f9f9f9',
                                  fontSize: '0.9rem',
                                }}
                              >
                                {`📅 ${formatDate_yyyymmdd_to_ddmmyyyy(booking.day)}, ⏰ ${booking.begin.toString()}–${booking.end}, 🏢 ${booking.building}, 🖥️ ${booking.roomRemark}, 🪑 ${booking.deskRemark}`}
                              </span>
                            ))}
                          </div>
                        </div>
                      </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        }
      </LayoutPage>

    );
};

export default Colleagues;