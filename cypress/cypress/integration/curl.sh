

curl -X POST http://srv-app.bawue.seov.lan:8081/vis/F27B2CB1-1653-7AB7-0A4B-28AB6FF4FE69/service/JustizFa \
     -H "Content-Type: text/xml; charset=utf-8" \
     -H "SOAPAction: \"http://example.com/CreateOrUpdateVerfahren\"" \
     -d @request.xml