const getUniqueErrorMessage = (err:Error) => {
    let output:string;
    try {
        let fieldName = err.message.substring(err.message.lastIndexOf('.$') + 2, err.message.lastIndexOf('_1'));
        output = fieldName.split('index:')[1].toString().trim();
        if(output==='email'){
            output = 'This email is already taken.';
        } 
    } catch (err) {
        output = 'Unique field already exists';
    }

    return output
}


const getErrorMessage = (err:any) => {
    let message = ''

    if (err.code) {
        switch (err.code) {
            case 11000:
            case 11001:
                message = getUniqueErrorMessage(err)
                break
            default:
                message = 'Something went wrong';
        }
    } else {
        for (let errName in err.errors) {
            if (err.errors[errName].message) message = err.errors[errName].message;
        }
    }

    return message
}

export default getErrorMessage