// A DTO is a class whose only job is to describe, validate, and transfer data between the client and your application.\
//dto stand for data transfer object. It is a design pattern that is used to transfer data between software application subsystems. DTOs are often used in conjunction with data access objects to retrieve data from a database. DTOs are also used to transfer data between different layers of an application, such as the presentation layer and the business logic layer. DTOs are often used to encapsulate data and send it over the network. DTOs are also used to transfer data between different processes or threads.
import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
    //registerDTo is a class in here oop
    //as defination class group related properties and methods together.
    //here properites means data and method means action properties data or informatiion
    //in real world class mean description soomething here we are defining register properies like email, password, name and companyName
    //this class have properties only and no methods because this class is only used to transfer data between the client and the server.

    //Objects are created from that class.
    //in nest js we dont write new keyword to create object of class because nest js will automatically create object of class when we use it in controller or service.

    /*NestJS creates it for you behind the scenes (when validation/transformation is enabled). Internally, it does something conceptually like:

const dto = new RegisterDto();

dto.email = "abc@gmail.com";
dto.password = "password123";
dto.name = "Susmita";

Then it validates the object using the decorators like @IsEmail() and @MinLength().*/
  @IsEmail() // this is a decorator that is used to validate the email property of the RegisterDto class. without it can be any string and nest js has this decorator to validate the email property of the RegisterDto class. It checks if the value is a valid email address.
  email!: string; // this is property of the RegisterDto class. 

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @MinLength(1)
  companyName!: string;
}


/*A simple rule that beginners often find helpful is:

Property = What the object has (data).
Method = What the object does (action). */