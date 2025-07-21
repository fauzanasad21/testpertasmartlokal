import { createBrowserRouter } from "react-router-dom";
import RootLayout from "../Layouts/RootLayout";

import Home from "../pages/index"
import About from "../pages/about"
import Blog from "../pages/Blogs/index";
import SinglePost from "../pages/Blogs/_id";
import { apiTitle, randomData } from "../apis/loaders";
import ErrorPage from "../components/PageError";
import Dashboard from "../pages/dashboard";

export const router =createBrowserRouter([
    {
        path: "/",
        element: <RootLayout />,
        errorElement : <ErrorPage />,
        children:[
            {
                path: "/",
                element: <Home />,
            },
            {
                path: "/blog",
                element: <Blog />,
                loader: apiTitle

            },
            {
                path: "/blog/:id",
                element: <SinglePost />,
                loader: randomData
            },
            {
                path: "/about",
                element: <About />,
            },
            {
                path: "/dashboard",
                element: <Dashboard />,
                loader: randomData
            }
        ]
    },
]);