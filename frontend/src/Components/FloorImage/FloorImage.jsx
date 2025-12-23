import {IconButton} from '@mui/material';
import React, {useRef, useEffect} from 'react';
import FloorSelector from '../FloorSelector.js';
import { getRequest } from '../RequestFunctions/RequestFunctions.js';
import LaptopIcon from '@mui/icons-material/Laptop';
import HtmlTooltip from './HtmlTooltip.jsx';
/**
 * @param sendDataToParent The function that is called when data has to be transmitted to the parent component. 
 * @param present_color The color (green, blue, ...) of the known rooms.
 * @param click_freely False if the user is only allowed to click on already existing rooms.
 * @returns The rendered map with known rooms and the option to add an room.
 */
const FloorImage = (
    {
        sendDataToParent,
        present_color = 'blue',
        click_freely = true
    }) => {
    const headers = useRef(JSON.parse(sessionStorage.getItem('headers')));
    /* isHoveredOverOldRoom is true iff the mouse pointer is over an button that locates an known room on the map.*/
    const [isHoveredOverOldRoom, setIsHoveredOverOldRoom] = React.useState(false);
    const [x, setX] = React.useState(0.0);
    const [y, setY] = React.useState(0.0);
    const [rooms, setRooms] = React.useState([]);
    const [floor, setFloor] = React.useState('');
    const [room, setRoom] = React.useState('');
    const new_color = 'green';

    const handleChildData = (data) => {
        setFloor(data);
    };

    useEffect(()=>{
        sendDataToParent({'floor': floor, 'room': room, 'x':x, 'y': y});
      },[sendDataToParent, floor, room, x, y]);

    // Fetch rooms for floor.
    useEffect(() => {
        if (floor?.name && floor?.nameOfImg) {
            getRequest(
                `${process.env.REACT_APP_BACKEND_URL}/rooms/getAllByFloorId/${floor.floor_id}`,
                headers.current,
                setRooms,
                () => {
                    console.log('Error fetching default building and floor in fetchDefaultFloor.js');
                }
            );
        }
    }, [floor]);
    
    /** Set isHoveredOverOldRoom to true to indicate that the mousepointer is above an button that locates known room on the map.*/
    const handleMouseEnter = () => {
        setIsHoveredOverOldRoom(true);
    };
    
    /** Set isHoveredOverOldRoom to false to indicate that the mousepointer is not above an button that locates an known room on the map.*/
    const handleMouseLeave = () => {
        setIsHoveredOverOldRoom(false);
    };

    const handleMouseClick = (e) => {
        /**
         * We check if the mouse pointer is above an button that locates an known room on the map.
         * If so we ignore the mouseclick. This happens because otherwise the new room will be positioned
         * on an random place on the map. This behaviour is a bug and this is only a workaround.
         */
        if (isHoveredOverOldRoom) {
            return;
        }
        const rect = e.target.getBoundingClientRect();
        const x_curr = e.clientX - rect.left; // X coordinate within the image
        const y_curr = e.clientY - rect.top; // Y coordinate within the image
        const xPercent =  (x_curr/rect.width)*100; 
        const yPercent =  (y_curr/rect.height)*100;
        setX(xPercent);
        setY(yPercent);
    }
    return (
        <>  
            <FloorSelector
                idString={'Floor_FloorImage'}
                sendDataToParent={handleChildData}
            />
            <br/><br/>
            {floor !== '' && (
                <div style={{position: 'relative', display:'inline-block'}} onMouseDown={handleMouseClick}>
                    <img src={`/Assets/${floor.building.name}/${floor.nameOfImg}`} alt='floorImage'  
                        style={{ maxWidth: '100%', maxHeight: '600px', position: 'relative' }} 
                    />
                    {click_freely && x !== 0.0 && y !== 0.0 && (
                        <div
                            style={{
                                position: 'absolute', fontSize: '30px', transform: 'translate(-50%, -50%)',
                                top: `${y}%`,
                                left: `${x}%`
                            }}
                        >
                            <IconButton>
                                <LaptopIcon 
                                    style={{ 
                                        color: new_color, 
                                        fontSize: '24px' 
                                    }}
                                />
                            </IconButton>
                        </div>
                    )}

                    {/* Render icons for all rooms matching the current floor */}
                    {
                        rooms
                        .map((room, i) => (
                            <div
                                key={i}                                
                                style={{
                                    top: `${room.y}%`,
                                    left: `${room.x}%`,
                                    position: 'absolute',
                                    fontSize: '30px',
                                    transform: 'translate(-50%, -50%)'
                                }}
                            >
                                <HtmlTooltip
                                    title={
                                        <React.Fragment>
                                            <em>{room.remark}</em>
                                        </React.Fragment>
                                    }
                                >
                                <IconButton
                                    onMouseEnter={handleMouseEnter}
                                    onMouseLeave={handleMouseLeave}
                                    id={`icon_button_${room.remark}`}
                                    onClick={() => setRoom(room)}
                                >
                                    <LaptopIcon
                                        style={{ 
                                            color: present_color, 
                                            fontSize: '24px'
                                        }}
                                        id={`icon_${room.remark}`}
                                    />
                                </IconButton>
                            </HtmlTooltip>
                        </div>
                    ))}
                </div>
            )}
        </>

    );  
};

export default FloorImage;