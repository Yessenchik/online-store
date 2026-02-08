const sendSuccess = (
    res,
    { data = null, message = "ok", status = 200 } = {},
) => {
    return res.status(status).json({
        success: true,
        message,
        data,
    });
};

const sendError = (
    res,
    { status = 500, message = "Something went wrong" } = {},
) => {
    return res.status(status).json({
        success: false,
        message,
    });
};

module.exports = { sendSuccess, sendError };
