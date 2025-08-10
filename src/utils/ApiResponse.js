class ApiResponse {
    constructor(statusCode , message = "Success" , data){
        this.statusCode = statusCode < 400;
        this.message = message;
        this.data = data;
        this.success = true 
    }
}


export { ApiResponse }