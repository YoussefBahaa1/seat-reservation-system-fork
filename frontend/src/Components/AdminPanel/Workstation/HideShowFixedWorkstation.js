import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import FloorSelector from '../../FloorSelector';
import LayoutModalAdmin from '../../Templates/LayoutModalAdmin.jsx';
import { getRequest, putRequest } from '../../RequestFunctions/RequestFunctions';
import { DeskTable } from '../../misc/DesksTable';
import ReportDefectModal from '../../Defects/ReportDefectModal';
import { colorVars } from '../../../theme';

export default function HideShowFixedWorkstation({ isOpen, onClose }) {
  const headers = useRef(JSON.parse(sessionStorage.getItem('headers')));
  const { t } = useTranslation();
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [desksForFloor, setDesksForFloor] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [reportDefectDeskId, setReportDefectDeskId] = useState(null);
  const [isReportDefectOpen, setIsReportDefectOpen] = useState(false);

  const getRequestAsPromise = useCallback((url) => (
    new Promise((resolve, reject) => {
      getRequest(
        url,
        headers.current,
        (data) => resolve(data),
        (status) => reject(status)
      );
    })
  ), []);

  const loadDesksForFloor = useCallback(async (floor) => {
    if (!floor?.floor_id) {
      setDesksForFloor([]);
      return;
    }

    setIsLoading(true);
    try {
      const rooms = await getRequestAsPromise(
        `${process.env.REACT_APP_BACKEND_URL}/rooms/getAllByFloorId/${floor.floor_id}`
      );
      const safeRooms = Array.isArray(rooms) ? rooms : [];
      const desksByRoom = await Promise.all(
        safeRooms.map((room) =>
          getRequestAsPromise(`${process.env.REACT_APP_BACKEND_URL}/admin/desks/roomAll/${room.id}`)
            .catch(() => [])
        )
      );

      const mergedDesks = desksByRoom.flatMap((roomDesks, idx) => {
        const room = safeRooms[idx];
        const safeDesks = Array.isArray(roomDesks) ? roomDesks : [];
        return safeDesks.map((desk) => ({
          ...desk,
          room: desk.room || room
        }));
      });

      mergedDesks.sort((a, b) => {
        const roomA = String(a?.room?.remark || '');
        const roomB = String(b?.room?.remark || '');
        if (roomA < roomB) return -1;
        if (roomA > roomB) return 1;
        const deskA = String(a?.remark || '');
        const deskB = String(b?.remark || '');
        return deskA.localeCompare(deskB);
      });
      setDesksForFloor(mergedDesks.filter((desk) => desk?.fixed === true));
    } catch {
      setDesksForFloor([]);
      toast.error(t('fixedDeskLoadFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [getRequestAsPromise, t]);

  useEffect(() => {
    if (!selectedFloor?.floor_id) {
      setDesksForFloor([]);
      return;
    }
    loadDesksForFloor(selectedFloor);
  }, [selectedFloor, loadDesksForFloor]);

  const toggleDeskHidden = (desk) => {
    if (!desk?.id) return;
    putRequest(
      `${process.env.REACT_APP_BACKEND_URL}/admin/desks/toggleHidden/${desk.id}`,
      headers.current,
      () => {
        toast.success(t('deskVisibilityToggleSuccess'));
        loadDesksForFloor(selectedFloor);
      },
      () => toast.error(t('deskVisibilityToggleFailed')),
      JSON.stringify({})
    );
  };

  const handleReportDefect = (desk) => {
    getRequest(
      `${process.env.REACT_APP_BACKEND_URL}/defects/active?deskId=${desk.id}`,
      headers.current,
      () => toast.warning(t('defectAlreadyOpen')),
      (status) => {
        if (status === 404) {
          setReportDefectDeskId(desk.id);
          setIsReportDefectOpen(true);
        } else {
          toast.error(t('defectReportFailed'));
        }
      }
    );
  };

  return (
    <>
      <LayoutModalAdmin
        onClose={onClose}
        isOpen={isOpen}
        title={t('hideShowFixedDesk')}
        closeTxt={t('close')}
      >
        <div style={{ marginTop: '8px' }}>
          <FloorSelector
            idString='HideShowFixed'
            sendDataToParent={setSelectedFloor}
          />
        </div>
        <br/><br/>
        {isLoading ? (
          <div>{t('loading')}</div>
        ) : (
          desksForFloor.length > 0
            ? (
              <DeskTable
                name='hideShowFixed'
                desks={desksForFloor}
                submit_function={toggleDeskHidden}
                submitLabelKeyForDesk={(desk) => (desk?.hidden ? 'show' : 'hide')}
                submitButtonSxForDesk={(desk) => (
                  desk?.hidden
                    ? {
                      backgroundColor: colorVars.state.neutral,
                      '&:hover': { backgroundColor: colorVars.state.neutralDark }
                    }
                    : undefined
                )}
                onReportDefect={handleReportDefect}
              />
            )
            : <div>{t('noDesksForSelectedFloor')}</div>
        )}
      </LayoutModalAdmin>
      <ReportDefectModal
        isOpen={isReportDefectOpen}
        onClose={() => setIsReportDefectOpen(false)}
        deskId={reportDefectDeskId}
      />
    </>
  );
}
