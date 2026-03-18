const formatRoleName = (roleName) => {
  if (!roleName) {
    return '-';
  }

  return roleName
    .replace(/^ROLE_/, '')
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

export default formatRoleName;
