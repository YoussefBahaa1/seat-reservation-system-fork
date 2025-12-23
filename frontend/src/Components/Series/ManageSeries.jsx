import  {useRef, useEffect, useState} from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import {getRequest, deleteRequest} from '../RequestFunctions/RequestFunctions';
import Button from '@mui/material/Button';
import DeleteFf from '../DeleteFf';
import {formatDate_yyyymmdd_to_ddmmyyyy} from '../misc/formatDate.js'
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import LayoutPage from '../Templates/LayoutPage.jsx';

const ManageSeries = () => {
  const headers = useRef(JSON.parse(sessionStorage.getItem('headers')));
  const { t, i18n } = useTranslation();
  const [serieses, setSerieses] = useState([]);
  const [openFfDialog, setOpenFfDialog] = useState(false);
  const [selectedSeries, setSelectedSeries] = useState('');
  const [refresh, setRefresh] = useState(true);

  function create_headline() {
    return i18n.language === 'de' ? 'Verwalten von Serienterminen' : 'Management of Series Bookings';
  }

  /**
   * Fetch the series for the logged in user.
   */
  useEffect(() => {
    getRequest(
        `${process.env.REACT_APP_BACKEND_URL}/series/${localStorage.getItem('email')}`, 
        headers.current,
        setSerieses,
        () => {
          console.log('Error fetching series in ManageSeries.jsx');
        }
    );
  }, [refresh]); 

  function deleteSeries() {
    deleteRequest(
      `${process.env.REACT_APP_BACKEND_URL}/series/${selectedSeries.id}`,
      headers.current,
      (ret) => {
          if (ret === 1) {
            toast.success('de' ? `Serienterminen wurde erfolgreich gelöscht.` : `Series bookings was successful deleted.`);
            setRefresh(!refresh);
          }
      },
      () => {
        console.log('Error deleting series in ManageSeries.jsx');
      }
    );
  }


  function create_helpText() {
    return i18n.language === 'de' ? 'Die Übersicht zu all Ihren getätigten Serienbuchungen, inklusive der Möglichkeit diese zu löschen.' : 'An overview of all your recurring bookings, including the option to delete them.';
  }

  return (
    <LayoutPage
      title={create_headline()}
      helpText={create_helpText()}
    >
    <DeleteFf 
      open={openFfDialog}
      onClose={()=>{setOpenFfDialog(false);}}
      onDelete={deleteSeries}
      text={i18n.language === 'de' ? 'Möchten Sie diese Serienbuchung mit allen Buchungen wirklich löschen?' : 'With this series all associated bookings will be deleted.'}
    />
      {serieses && serieses.length > 0 ? 

        <TableContainer component={Paper} sx={{
          maxHeight: 1000, // Set max height
          overflowY: 'auto', // Enable vertical scroll
        }}>
          <Table stickyHeader>
            <TableHead>
                <TableRow>
                  <TableCell>{t('startDate')}</TableCell>
                  <TableCell>{t('endDate')}</TableCell>
                  <TableCell>{t('startTime')}</TableCell>
                  <TableCell>{t('endTime')}</TableCell>
                  <TableCell>{t('deskRemark')}</TableCell>
                  <TableCell>{t('roomRemark')}</TableCell>
                  <TableCell>{t('building')}</TableCell>
                  <TableCell></TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
              {serieses.map((series) => (
                <TableRow key={series.id}>
                  <TableCell>{formatDate_yyyymmdd_to_ddmmyyyy(series.rangeDTO.startDate)}</TableCell>
                  <TableCell>{formatDate_yyyymmdd_to_ddmmyyyy(series.rangeDTO.endDate)}</TableCell>
                  <TableCell>{series.rangeDTO.startTime}</TableCell>
                  <TableCell>{series.rangeDTO.endTime}</TableCell>
                  <TableCell>{series.desk.remark}</TableCell>
                  <TableCell>{series.room.remark}</TableCell>
                  <TableCell>{series.room.floor.building.name}</TableCell>
                  <TableCell>
                    <Button variant='contained' onClick={(_)=>{
                      setSelectedSeries(series);
                      setOpenFfDialog(true);                      
                    }}>
                        {t('delete')}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            </Table>
          </TableContainer>
        : <div>{i18n.language === 'de' ? 'Für Sie wurden keine Serienterminen gefunden.' : 'For the current user no series booking was found.'}</div>}
    </LayoutPage>
  );
};

export default ManageSeries;
