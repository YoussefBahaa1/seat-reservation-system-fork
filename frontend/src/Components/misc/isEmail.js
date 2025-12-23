const isEmail = email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
//const isEmail = email => /^[^\s@]+@lit\.justiz\.sachsen\.de$/i.test(email);
export default isEmail;