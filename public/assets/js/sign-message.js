/*
 * JavaScript client-side example using jsrsasign
 */

// #########################################################
// #             WARNING   WARNING   WARNING               #
// #########################################################
// #                                                       #
// # This file is intended for demonstration purposes      #
// # only.                                                 #
// #                                                       #
// # It is the SOLE responsibility of YOU, the programmer  #
// # to prevent against unauthorized access to any signing #
// # functions.                                            #
// #                                                       #
// # Organizations that do not protect against un-         #
// # authorized signing will be black-listed to prevent    #
// # software piracy.                                      #
// #                                                       #
// # -QZ Industries, LLC                                   #
// #                                                       #
// #########################################################

/**
 * Depends:
 *     - jsrsasign-latest-all-min.js
 *     - qz-tray.js
 *
 * Steps:
 *
 *     1. Include jsrsasign 10.9.0 into your web page
 *        <script src="https://cdnjs.cloudflare.com/ajax/libs/jsrsasign/11.1.0/jsrsasign-all-min.js"></script>
 *
 *     2. Update the privateKey below with contents from private-key.pem
 *
 *     3. Include this script into your web page
 *        <script src="path/to/sign-message.js"></script>
 *
 *     4. Remove or comment out any other references to "setSignaturePromise"
 *
 *     5. IMPORTANT: Before deploying to production, copy "jsrsasign-all-min.js"
 *        to the web server.  Don't trust the CDN above to be available.
 */
var privateKey = "-----BEGIN PRIVATE KEY----- \n" +
"MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC7XIuA79aM5eY/ \n" +
"v4NMvQmmJJ9QS6HcGFlOjiqu88WLtzNyftT7ZWvzPgvcEXu+0h+IkKRyo0ZfI214 \n" +
"+qEN6xFtLzzESGLMNJEzRl4vokP/MgpsrWQ8lr8RMU7nvfj+WF2BHN6p4tngMA94 \n" +
"vwjE1UTU9jh9T/rw9/gvYlj1UZAWSm85CTIrQBLZx6Nf73AtbbF0PmC1ENslB05p \n" +
"rQh9GEJMpw845o97zmPK/6CKB2BXBILl8J1L9KI1cmBjXMenXNAu7hcnTCl/TKCD \n" +
"bQ6VQN5zvvHyC2cFMpIJ35CkOzpP/H/dxOhCCGgjZOsatIzidLKDlDUwYVFdH9BI \n" +
"AjzPlbbfAgMBAAECggEABmYWSESTUQc6xdmxAH3tKf2n+lfTzYsq5TPrGidnYKN/ \n" +
"Ud1Glw9hc/06fD0juv7ZO/YYNedoSL6gjn9kUn5BKhs4OdhUXMwglAicFfm2f+YF \n" +
"nDs6aEH9udpeI/MaxPiKRzIeGmuqSMo+9emeiGGAPaIj+fj4aQXyiw9Lduqz+CtO \n" +
"Tlp/etHQXIyaWGqGrUIgUmWcNJFJa5n2F+/c3cPzhNjzfwfwlqPDvaLjtxDtxCHH \n" +
"3ACeajDP+J5zRhhp0mI5qe1DPl6jAu8gtfvQDd7UNd5cl2y4zLSD57+tLPPIBiLd \n" +
"Fjg/cOQWZ9+kvfA4STi7oVkmXpKaCX6Ko6EP1804gQKBgQDlm9T3mSZsBqIiKqDU \n" +
"nad3By34ZN9+u2nsjOGTpvI0qbX/tYy2V/NFzrSlvcFhhrCosvK2cYxXQ3AArJEp \n" +
"r/nDPzbb+JM7SUvPI7sqrfy9wCCybSvgqgTPr5N8OUlQgjmD5YKkVjsbG1hxzzYm \n" +
"pbq27QehmgY2Ud1cVGEuyGoJSwKBgQDQ5Znw9wKdqJb9r5CXnwjK4yJB8E0+rLxM \n" +
"f5h6zRu9VD9oRXLm7RE8u3vUPtSXWNFcyoYqWChMtpzE3LPWEnnem/ZiuPqnRTZI \n" +
"9fN8uKBoWT8CQ1m0P6D7GqZoX9r6KAR/GWcIHJsOQYLLuB4emYjUnVKObxpF/Nuz \n" +
"wRVfXYSAPQKBgQCYQxKjbwgvsuZpyeMFm9al9Djj8+DR5e6EU5hzlc4gZjqu6/H4 \n" +
"KbLFpCHfl0paJjuYY7LYkcwDQlFP4SASiQQUGiODFABu3FhNcOB5mQ91tab5K7Rh \n" +
"M94k68XeJw8bOIBzmwtbd2OSwjuQnVzHnDeJfv4EiGN+OiOVSs93eqf2qQKBgFBM \n" +
"cehWiwLfk2rg2cvurgqPVNPT811sONWPFqXdwhP9FoKWb5yk9ENMLkVgAYhL8+6f \n" +
"SwNr79HNQGXMELTxVTdk7Ej2oiM6T6usH3SJ4984ryfHi+vlqZPcoqrsbdhLGa9h \n" +
"rGFJ3bCVLhnxJGLO0fIop1tpCchtcmaeigCmihBhAoGBALY6ctvtW/piDZma/MVi \n" +
"Co/axnDygdAD/N0u4lbrbQVHpviKDL7EMDokZOIs8E4WXMMDGUXPZgnppbs6dP4F \n" +
"BuWXtE5k5iTzVkJhZB6S/2Nvf79q86JMxZPNwAhtg1EjzOHq3dIaxUQE3EPpExgH \n" +
"3GSYi1ys3Q4Q73n36+2or429 \n"+
"-----END PRIVATE KEY----- \n";

qz.security.setSignatureAlgorithm("SHA512"); // Since 2.1
qz.security.setSignaturePromise(function(toSign) {
    return function(resolve, reject) {
        try {
            var pk = KEYUTIL.getKey(privateKey);
            var sig = new KJUR.crypto.Signature({"alg": "SHA512withRSA"});  // Use "SHA1withRSA" for QZ Tray 2.0 and older
            sig.init(pk); 
            sig.updateString(toSign);
            var hex = sig.sign();
            console.log("DEBUG: \n\n" + stob64(hextorstr(hex)));
            resolve(stob64(hextorstr(hex)));
        } catch (err) {
            console.error(err);
            reject(err);
        }
    };
});
