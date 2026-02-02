import React from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button, Chip } from '@mui/material';
import FilterUser from './FilterUser';

function UserTable({ users, onAction, action, actionRenderer, t, onDisableMfa }) {
  const [filterFunction, setFilterFunction] = React.useState(() => (_)=>{return true});

  // Filter users
  const filteredUsers = users.filter(filterFunction);

  const getRoleLabel = (user) => {
    if (user.admin) {
      return t('admin');
    }
    if (user.employee && user.servicePersonnel) {
      return `${t('employee')}/${t('servicePersonnel')}`;
    }
    if (user.employee) {
      return t('employee');
    }
    if (user.servicePersonnel) {
      return t('servicePersonnel');
    }
    return '-';
  };
  
  // Sort: active users first, then by email for stable ordering
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    // Active users come first (active=true should be before active=false)
    if (a.active !== b.active) {
      return a.active ? -1 : 1;
    }
    // Secondary sort by email for stable ordering
    return (a.email || '').localeCompare(b.email || '');
  });
  
  return (
    <>
      <FilterUser setFilterFunction={setFilterFunction} t={t} />

      <TableContainer component={Paper} style={{ maxHeight: '400px', overflow: 'auto' }}>
        <Table stickyHeader sx={{ minWidth: 900, marginTop: 1, maxHeight:'400px' }}>
          <TableHead sx={{backgroundColor: 'green', color:'white'}}>
            <TableRow>
              <TableCell sx={{backgroundColor: 'green', textAlign: 'center', fontSize:15, color:'white'}}>{t("email")}</TableCell>
              <TableCell sx={{backgroundColor: 'green', textAlign: 'center', fontSize:15, color:'white' }}>{t("name")}</TableCell>
              <TableCell sx={{backgroundColor: 'green', textAlign: 'center', fontSize:15, color:'white' }}>{t("surname")}</TableCell>
              <TableCell sx={{backgroundColor: 'green', textAlign: 'center', fontSize:15, color:'white' }}>{t("department")}</TableCell>
              <TableCell sx={{backgroundColor: 'green', textAlign: 'center', fontSize:15, color:'white' }}>{t("activity")}</TableCell>
              <TableCell sx={{backgroundColor: 'green', textAlign: 'center', fontSize:15, color:'white' }}>{t('role')}</TableCell>
              <TableCell sx={{backgroundColor: 'green', textAlign: 'center', fontSize:15, color:'white' }}>MFA</TableCell>
              <TableCell sx={{backgroundColor: 'green', textAlign: 'center', fontSize:15, color:'white' }} colSpan={2}>{t("action")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedUsers.map((row) => (
              <TableRow id={row.email} key={row.id} sx={{ opacity: row.active === false ? 0.6 : 1 }}>
                <TableCell sx={{textAlign: 'center', fontSize:14, fontWeight:400 }} >
                  {row.email}
                </TableCell>
                <TableCell sx={{textAlign: 'center', fontSize:14, fontWeight:400 }} >
                  {row.name}
                </TableCell>
                <TableCell sx={{textAlign: 'center', fontSize:14, fontWeight:400 }} >
                  {row.surname}
                </TableCell>
                <TableCell sx={{textAlign: 'center', fontSize:14, fontWeight:400 }} >
                  {row.department || '-'}
                </TableCell>
                <TableCell sx={{textAlign: 'center', fontSize:14, fontWeight:400 }} >
                  {row.active !== false ? (
                    <Chip label={t('active')} color="success" size="small" />
                  ) : (
                    <Chip label={t('deactivated')} color="error" size="small" variant="outlined" />
                  )}
                </TableCell>
                <TableCell sx={{textAlign: 'center', fontSize:14, fontWeight:400 }} >
                  {getRoleLabel(row)}
                </TableCell>
                <TableCell sx={{textAlign: 'center', fontSize:14, fontWeight:400 }} >
                  {row.mfaEnabled ? (
                    <Chip 
                      label={t('mfaEnabled')} 
                      color="success" 
                      size="small"
                      onClick={onDisableMfa ? () => onDisableMfa(row.id) : undefined}
                      onDelete={onDisableMfa ? () => onDisableMfa(row.id) : undefined}
                      title={onDisableMfa ? t('mfaRecovery') : ''}
                    />
                  ) : (
                    <Chip label={t('mfaDisabled')} color="default" size="small" variant="outlined" />
                  )}
                </TableCell>
                <TableCell sx={{textAlign: 'center', fontSize:14, width:'20%' }} component="th" scope="row">
                  <Button onClick={() => onAction(row.id)}>
                    {actionRenderer ? actionRenderer(row) : action}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}

export default UserTable;
import React from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button } from '@mui/material';
import FilterEmployee from './FilterEmployee';

function EmployeeTable({ employees, onAction, action, t }) {
  const [filterFunction, setFilterFunction] = React.useState(() => (_)=>{return true});

  const filteredEmployees = employees.filter(filterFunction);  
  
  return (
    <>
      <FilterEmployee setFilterFunction={setFilterFunction} />

      <TableContainer component={Paper} style={{ maxHeight: '400px', overflow: 'auto' }}>
        <Table stickyHeader sx={{ minWidth: 450, marginTop: 1, maxHeight:'400px' }}>
          <TableHead sx={{backgroundColor: 'green', color:'white'}}>
            <TableRow>
              <TableCell sx={{backgroundColor: 'green', textAlign: 'center', fontSize:15, color:'white'}}>{t("email")}</TableCell>
              <TableCell sx={{backgroundColor: 'green', textAlign: 'center', fontSize:15, color:'white' }}>{t("name")}</TableCell>
              <TableCell sx={{backgroundColor: 'green', textAlign: 'center', fontSize:15, color:'white' }}>{t("surname")}</TableCell>
              <TableCell sx={{backgroundColor: 'green', textAlign: 'center', fontSize:15, color:'white' }}>{t("admin")}</TableCell>
              <TableCell sx={{backgroundColor: 'green', textAlign: 'center', fontSize:15, color:'white' }}>{t("visibility")}</TableCell>
              <TableCell sx={{backgroundColor: 'green', textAlign: 'center', fontSize:15, color:'white' }} colSpan={2}>{t("action")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredEmployees.map((row) => (
              <TableRow id={row.email} key={row.id}>
                <TableCell sx={{textAlign: 'center', fontSize:14, fontWeight:400 }} >
                  {row.email}
                </TableCell>
                <TableCell sx={{textAlign: 'center', fontSize:14, fontWeight:400 }} >
                  {row.name}
                </TableCell>
                <TableCell sx={{textAlign: 'center', fontSize:14, fontWeight:400 }} >
                  {row.surname}
                </TableCell>
                <TableCell sx={{textAlign: 'center', fontSize:14, fontWeight:400 }} >
                  {row.admin ? t('true') : t('false')}
                </TableCell>
                <TableCell sx={{textAlign: 'center', fontSize:14, fontWeight:400 }} >
                  {row.visibilityMode === 'ANONYMOUS'
                    ? t('anonymous')
                    : row.visibilityMode === 'ABBREVIATION'
                    ? t('abbreviationCap')
                    : t('name')}
                </TableCell>
                <TableCell sx={{textAlign: 'center', fontSize:14, width:'30%' }} component="th" scope="row">
                  <Button onClick={() => onAction(row.id)}>{action}</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}
