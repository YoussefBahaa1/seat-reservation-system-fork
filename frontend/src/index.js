import React from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next'; // Import the I18nextProvider
import './index.css';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import App from './App';
//import reportWebVitals from './reportWebVitals';
import i18n from './i18n';

const root = createRoot(document.getElementById('root'));
root.render(
  
  //We like to avoid some warnings with some packages.
  //<React.StrictMode>
  
    <I18nextProvider i18n={i18n}>
      <App />
      <ToastContainer 
        // position="bottom-right"
        autoClose={2000}
      />
    </I18nextProvider>

//</React.StrictMode>

);

//reportWebVitals();
