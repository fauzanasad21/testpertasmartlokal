import { useRouteError } from "react-router-dom";
import MyImage from "../assets/error.png"

function ErrorPage () {
    const error = useRouteError();
    console.log(error);
    return (
        <>
            <img src={MyImage} alt="gambar error" />
            <div>Error Loh, Tolong Benerin</div>
        </>
    )
}

export default ErrorPage